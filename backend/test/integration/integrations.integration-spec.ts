import request from 'supertest';
import { addDays, todayInHotel } from '../../src/common/dates/date-utils.js';
import { createBooking, createPackage, createRoom } from './fixtures.js';
import {
  createIntegrationApp,
  resetDatabase,
  type IntegrationApp,
} from './test-app.js';

// Klucze zgodne z INTEGRATION_API_KEYS w vitest.config.integration.ts. (DamianTchorzewski_72206)
const MASSAGE_KEY = 'test-massage-key-0001';
const FITNESS_KEY = 'test-fitness-key-0002';

const STAY = { checkIn: '2030-06-10', checkOut: '2030-06-13' };

describe('Stay verification for partner teams (integration, real PostgreSQL)', () => {
  let ctx: IntegrationApp;

  const verify = (
    code: string,
    query = '',
    key: string | null = MASSAGE_KEY,
  ) => {
    const call = request(ctx.app.getHttpServer()).get(
      `/api/v1/integrations/bookings/${code}/verification${query}`,
    );
    return key === null ? call : call.set('X-API-Key', key);
  };

  beforeAll(async () => {
    ctx = await createIntegrationApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('authentication', () => {
    it('answers 401 without an API key', async () => {
      const room = await createRoom(ctx.prisma);
      const booking = await createBooking(ctx.prisma, room.id, STAY);

      const response = await verify(booking.bookingCode, '', null).expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
      expect(response.body).not.toHaveProperty('bookingCode');
      expect(response.body).not.toHaveProperty('package');
    });

    it('answers 401 for a wrong key', async () => {
      const room = await createRoom(ctx.prisma);
      const booking = await createBooking(ctx.prisma, room.id, STAY);

      await verify(booking.bookingCode, '', 'wrong-key-wrong-key-0000').expect(
        401,
      );
    });

    it('does not reveal whether a code exists to a caller without a key', async () => {
      const room = await createRoom(ctx.prisma);
      const existing = await createBooking(ctx.prisma, room.id, STAY);

      const forExisting = await verify(existing.bookingCode, '', null).expect(
        401,
      );
      const forUnknown = await verify('HTL-2030-ZZZZ', '', null).expect(401);

      // Odpowiedzi różnią się tylko adresem z żądania i czasem, więc nic nie zdradzają o istnieniu kodu. (DamianTchorzewski_72206)
      const strip = (body: Record<string, unknown>) => ({
        ...body,
        path: undefined,
        timestamp: undefined,
      });
      expect(strip(forExisting.body)).toEqual(strip(forUnknown.body));
    });

    it.each([
      ['massage', MASSAGE_KEY],
      ['fitness', FITNESS_KEY],
    ])('accepts the key of the %s team', async (_team, key) => {
      const room = await createRoom(ctx.prisma);
      const booking = await createBooking(ctx.prisma, room.id, STAY);

      await verify(booking.bookingCode, '', key).expect(200);
    });
  });

  describe('verification', () => {
    it('returns the stay and the package services for a day within the stay', async () => {
      const room = await createRoom(ctx.prisma);
      const spa = await createPackage(ctx.prisma, {
        name: 'Relaks SPA',
        includedServices: ['MASSAGE_RELAX_60', 'SPA_ACCESS'],
      });
      const booking = await createBooking(ctx.prisma, room.id, STAY, {
        packageId: spa.id,
        guestsCount: 2,
      });

      const response = await verify(
        booking.bookingCode,
        '?date=2030-06-11',
      ).expect(200);

      expect(response.body).toEqual({
        bookingCode: booking.bookingCode,
        status: 'CONFIRMED',
        date: '2030-06-11',
        isActive: true,
        checkIn: STAY.checkIn,
        checkOut: STAY.checkOut,
        guestsCount: 2,
        package: {
          id: spa.id,
          name: 'Relaks SPA',
          includedServices: ['MASSAGE_RELAX_60', 'SPA_ACCESS'],
        },
      });
    });

    it.each([
      ['the day before the arrival', '2030-06-09', false],
      ['the arrival day', '2030-06-10', true],
      ['the departure day', '2030-06-13', true],
      ['the day after the departure', '2030-06-14', false],
    ])('for %s isActive is %s', async (_label, date, expected) => {
      const room = await createRoom(ctx.prisma);
      const booking = await createBooking(ctx.prisma, room.id, STAY);

      const response = await verify(
        booking.bookingCode,
        `?date=${date}`,
      ).expect(200);

      expect(response.body.isActive).toBe(expected);
    });

    it('checks today when no date is given', async () => {
      const today = todayInHotel();
      const room = await createRoom(ctx.prisma);
      const current = await createBooking(ctx.prisma, room.id, {
        checkIn: addDays(today, -1),
        checkOut: addDays(today, 2),
      });
      const other = await createRoom(ctx.prisma);
      const future = await createBooking(ctx.prisma, other.id, {
        checkIn: addDays(today, 10),
        checkOut: addDays(today, 12),
      });

      const active = await verify(current.bookingCode).expect(200);
      const notYet = await verify(future.bookingCode).expect(200);

      expect(active.body).toMatchObject({ date: today, isActive: true });
      expect(notYet.body).toMatchObject({ date: today, isActive: false });
    });

    it('returns a null package for a booking without one', async () => {
      const room = await createRoom(ctx.prisma);
      const booking = await createBooking(ctx.prisma, room.id, STAY);

      const response = await verify(
        booking.bookingCode,
        '?date=2030-06-11',
      ).expect(200);

      expect(response.body.package).toBeNull();
    });

    it('reports a cancelled booking as inactive instead of failing', async () => {
      const room = await createRoom(ctx.prisma);
      const booking = await createBooking(ctx.prisma, room.id, STAY, {
        status: 'CANCELLED',
      });

      const response = await verify(
        booking.bookingCode,
        '?date=2030-06-11',
      ).expect(200);

      expect(response.body).toMatchObject({
        status: 'CANCELLED',
        isActive: false,
      });
    });

    it('accepts a lower case code', async () => {
      const room = await createRoom(ctx.prisma);
      const booking = await createBooking(ctx.prisma, room.id, STAY);

      const response = await verify(
        booking.bookingCode.toLowerCase(),
        '?date=2030-06-11',
      ).expect(200);

      expect(response.body.bookingCode).toBe(booking.bookingCode);
    });

    it('answers 404 for an unknown code', async () => {
      const response = await verify('HTL-2030-ZZZZ').expect(404);

      expect(response.body.code).toBe('BOOKING_NOT_FOUND');
    });

    it('exposes no personal data of the guest', async () => {
      const room = await createRoom(ctx.prisma);
      const booking = await createBooking(ctx.prisma, room.id, STAY, {
        guestFirstName: 'Zuzanna',
        guestLastName: 'Wiśniewska',
        guestEmail: 'zuzanna.wisniewska@example.com',
        guestPhone: '+48600700800',
      });

      const response = await verify(
        booking.bookingCode,
        '?date=2030-06-11',
      ).expect(200);

      expect(JSON.stringify(response.body)).not.toMatch(
        /Zuzanna|Wiśniewska|wisniewska|600700800/,
      );
    });

    it('validates the code and the date after the key is accepted', async () => {
      const code = await verify('abc').expect(400);
      const date = await verify('HTL-2030-ZZZZ', '?date=2030-02-30').expect(
        400,
      );

      expect(code.body.details[0].field).toBe('bookingCode');
      expect(date.body.details[0].field).toBe('date');
    });
  });

  it('follows a booking through its whole life: book, verify, cancel, verify', async () => {
    const room = await createRoom(ctx.prisma);
    const fitness = await createPackage(ctx.prisma, {
      includedServices: ['FITNESS_DAY_PASS'],
    });
    const server = ctx.app.getHttpServer();

    const created = await request(server)
      .post('/api/v1/bookings')
      .send({
        roomId: room.id,
        packageId: fitness.id,
        ...STAY,
        guestsCount: 2,
        guestDetails: {
          firstName: 'Jan',
          lastName: 'Kowalski',
          email: 'jan.kowalski@example.com',
          phone: '+48123456789',
        },
      })
      .expect(201);
    const code: string = created.body.bookingCode;

    const whileBooked = await verify(
      code,
      '?date=2030-06-11',
      FITNESS_KEY,
    ).expect(200);
    expect(whileBooked.body).toMatchObject({
      isActive: true,
      package: { includedServices: ['FITNESS_DAY_PASS'] },
    });

    await request(server)
      .post('/api/v1/bookings/cancel')
      .send({ bookingCode: code, email: 'jan.kowalski@example.com' })
      .expect(200);

    const afterCancel = await verify(
      code,
      '?date=2030-06-11',
      FITNESS_KEY,
    ).expect(200);
    expect(afterCancel.body).toMatchObject({
      status: 'CANCELLED',
      isActive: false,
    });
  });
});
