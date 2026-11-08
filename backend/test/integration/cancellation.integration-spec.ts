import request from 'supertest';
import { addDays, todayInHotel } from '../../src/common/dates/date-utils.js';
import { createBooking, createRoom } from './fixtures.js';
import {
  createIntegrationApp,
  resetDatabase,
  type IntegrationApp,
} from './test-app.js';

const STAY = { checkIn: '2030-06-10', checkOut: '2030-06-13' };
const DATES = `checkIn=${STAY.checkIn}&checkOut=${STAY.checkOut}`;
const EMAIL = 'jan.kowalski@example.com';
const GUEST = {
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: EMAIL,
  phone: '+48123456789',
};

describe('Cancellation (integration, real PostgreSQL)', () => {
  let ctx: IntegrationApp;

  const post = (path: string, body: object) =>
    request(ctx.app.getHttpServer()).post(path).send(body);
  const get = (path: string) => request(ctx.app.getHttpServer()).get(path);
  const cancel = (body: object) => post('/api/v1/bookings/cancel', body);
  const bookViaApi = (roomId: string) =>
    post('/api/v1/bookings', {
      roomId,
      ...STAY,
      guestsCount: 2,
      guestDetails: GUEST,
    });

  beforeAll(async () => {
    ctx = await createIntegrationApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('cancels a booking made through the API and stores the reason', async () => {
    const room = await createRoom(ctx.prisma);
    const created = await bookViaApi(room.id).expect(201);

    const response = await cancel({
      bookingCode: created.body.bookingCode,
      email: EMAIL,
      reason: 'Zmiana planów wyjazdowych',
    }).expect(200);

    expect(response.body).toMatchObject({
      id: created.body.id,
      bookingCode: created.body.bookingCode,
      status: 'CANCELLED',
      cancelReason: 'Zmiana planów wyjazdowych',
      totalPrice: created.body.totalPrice,
    });
    expect(new Date(response.body.cancelledAt).toString()).not.toBe(
      'Invalid Date',
    );

    const saved = await ctx.prisma.booking.findUniqueOrThrow({
      where: { id: created.body.id },
    });
    expect(saved.status).toBe('CANCELLED');
    expect(saved.cancelledAt).toBeInstanceOf(Date);
    expect(saved.cancelReason).toBe('Zmiana planów wyjazdowych');
  });

  it('frees the room: it shows up in the search and can be booked again', async () => {
    const room = await createRoom(ctx.prisma);
    const created = await bookViaApi(room.id).expect(201);
    const before = await get(`/api/v1/rooms?${DATES}`).expect(200);
    expect(before.body.data).toEqual([]);

    await cancel({
      bookingCode: created.body.bookingCode,
      email: EMAIL,
    }).expect(200);

    const after = await get(`/api/v1/rooms?${DATES}`).expect(200);
    expect(after.body.data.map((item: { id: string }) => item.id)).toEqual([
      room.id,
    ]);
    const rebooked = await bookViaApi(room.id).expect(201);
    expect(rebooked.body.bookingCode).not.toBe(created.body.bookingCode);
  });

  it('accepts a lower case code and an e-mail in a different letter case', async () => {
    const room = await createRoom(ctx.prisma);
    const booking = await createBooking(ctx.prisma, room.id, STAY, {
      guestEmail: 'Jan.Kowalski@Example.com',
    });

    const response = await cancel({
      bookingCode: booking.bookingCode.toLowerCase(),
      email: '  JAN.KOWALSKI@EXAMPLE.COM ',
    }).expect(200);

    expect(response.body.status).toBe('CANCELLED');
  });

  it('answers the same 404 for a wrong e-mail and for an unknown code', async () => {
    const room = await createRoom(ctx.prisma);
    const booking = await createBooking(ctx.prisma, room.id, STAY);

    const wrongEmail = await cancel({
      bookingCode: booking.bookingCode,
      email: 'someone.else@example.com',
    }).expect(404);
    const unknownCode = await cancel({
      bookingCode: 'HTL-2030-ZZZZ',
      email: EMAIL,
    }).expect(404);

    expect(wrongEmail.body.code).toBe('BOOKING_NOT_FOUND');
    expect(wrongEmail.body.message).toBe(unknownCode.body.message);
    expect(wrongEmail.body.details).toEqual(unknownCode.body.details);
    // Nieudana próba nie może zmienić rezerwacji. (DamianTchorzewski_72206)
    const saved = await ctx.prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(saved.status).toBe('CONFIRMED');
  });

  it('does not treat an underscore in the e-mail as a wildcard', async () => {
    const room = await createRoom(ctx.prisma);
    const booking = await createBooking(ctx.prisma, room.id, STAY, {
      guestEmail: 'jan_kowalski@example.com',
    });

    await cancel({
      bookingCode: booking.bookingCode,
      email: 'janXkowalski@example.com',
    }).expect(404);
  });

  it('answers 409 when the booking is already cancelled and keeps the first cancellation', async () => {
    const room = await createRoom(ctx.prisma);
    const booking = await createBooking(ctx.prisma, room.id, STAY);
    await cancel({
      bookingCode: booking.bookingCode,
      email: EMAIL,
      reason: 'pierwszy powód',
    }).expect(200);
    const firstCancellation = await ctx.prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });

    const response = await cancel({
      bookingCode: booking.bookingCode,
      email: EMAIL,
      reason: 'drugi powód',
    }).expect(409);

    expect(response.body.code).toBe('BOOKING_ALREADY_CANCELLED');
    const saved = await ctx.prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(saved.cancelReason).toBe('pierwszy powód');
    expect(saved.cancelledAt).toEqual(firstCancellation.cancelledAt);
  });

  describe('cancellation deadline', () => {
    const today = todayInHotel();

    it.each([
      ['arrival today', 0],
      ['a stay in progress', -2],
    ])(
      'answers 422 for %s and leaves the booking confirmed',
      async (_label, offset) => {
        const room = await createRoom(ctx.prisma);
        const checkIn = addDays(today, offset);
        const booking = await createBooking(ctx.prisma, room.id, {
          checkIn,
          checkOut: addDays(checkIn, 4),
        });

        const response = await cancel({
          bookingCode: booking.bookingCode,
          email: EMAIL,
        }).expect(422);

        expect(response.body.code).toBe('CANCELLATION_NOT_ALLOWED');
        const saved = await ctx.prisma.booking.findUniqueOrThrow({
          where: { id: booking.id },
        });
        expect(saved.status).toBe('CONFIRMED');
      },
    );

    it('still allows cancelling on the day before the arrival', async () => {
      const room = await createRoom(ctx.prisma);
      const checkIn = addDays(today, 1);
      const booking = await createBooking(ctx.prisma, room.id, {
        checkIn,
        checkOut: addDays(checkIn, 2),
      });

      await cancel({ bookingCode: booking.bookingCode, email: EMAIL }).expect(
        200,
      );
    });

    it('does not allow cancelling a completed stay', async () => {
      const room = await createRoom(ctx.prisma);
      const booking = await createBooking(ctx.prisma, room.id, STAY, {
        status: 'COMPLETED',
      });

      const response = await cancel({
        bookingCode: booking.bookingCode,
        email: EMAIL,
      }).expect(422);

      expect(response.body.code).toBe('CANCELLATION_NOT_ALLOWED');
    });
  });

  it('lets exactly one of many simultaneous cancellations succeed', async () => {
    const room = await createRoom(ctx.prisma);
    const booking = await createBooking(ctx.prisma, room.id, STAY);

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        cancel({ bookingCode: booking.bookingCode, email: EMAIL }),
      ),
    );

    const statuses = responses
      .map((response) => response.status)
      .sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409, 409, 409, 409, 409]);
  });

  it('validates the request before touching the database', async () => {
    const response = await cancel({
      bookingCode: 'not-a-code',
      email: 'not-an-email',
    }).expect(400);

    expect(
      response.body.details.map((detail: { field: string }) => detail.field),
    ).toEqual(['bookingCode', 'email']);
  });
});
