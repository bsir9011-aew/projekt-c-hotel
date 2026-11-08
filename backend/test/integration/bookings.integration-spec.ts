import request from 'supertest';
import { BOOKING_CODE_PATTERN } from '../../src/common/constants/booking.constants.js';
import { RoomAvailabilityService } from '../../src/modules/rooms/room-availability.service.js';
import { createBooking, createPackage, createRoom } from './fixtures.js';
import {
  createIntegrationApp,
  resetDatabase,
  type IntegrationApp,
} from './test-app.js';

// Daty z odległej przyszłości, aby reguła "przyjazd nie z przeszłości" nigdy nie zepsuła testów. (DamianTchorzewski_72206)
const STAY = { checkIn: '2030-06-10', checkOut: '2030-06-13' };

const GUEST = {
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: 'jan.kowalski@example.com',
  phone: '+48123456789',
};

describe('Bookings (integration, real PostgreSQL)', () => {
  let ctx: IntegrationApp;

  const post = (path: string, body: unknown) =>
    request(ctx.app.getHttpServer())
      .post(path)
      .send(body as object);
  const get = (path: string) => request(ctx.app.getHttpServer()).get(path);
  const book = (roomId: string, extra: Record<string, unknown> = {}) =>
    post('/api/v1/bookings', {
      roomId,
      ...STAY,
      guestsCount: 2,
      guestDetails: GUEST,
      ...extra,
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

  describe('POST /bookings', () => {
    it('creates a confirmed booking and saves it in the database', async () => {
      const room = await createRoom(ctx.prisma, {
        roomNumber: '101',
        name: 'Standard',
        pricePerNight: 350,
      });

      const response = await book(room.id, {
        voucherCode: 'JESIEN2026',
      }).expect(201);

      expect(response.body).toMatchObject({
        status: 'CONFIRMED',
        room: { id: room.id, name: 'Standard', roomNumber: '101' },
        package: null,
        checkIn: STAY.checkIn,
        checkOut: STAY.checkOut,
        nightsCount: 3,
        guestsCount: 2,
        totalPrice: 1050,
        guestDetails: GUEST,
        voucherCode: 'JESIEN2026',
        cancelledAt: null,
        cancelReason: null,
      });
      expect(response.body.bookingCode).toMatch(BOOKING_CODE_PATTERN);
      expect(new Date(response.body.createdAt).toString()).not.toBe(
        'Invalid Date',
      );

      const saved = await ctx.prisma.booking.findUniqueOrThrow({
        where: { bookingCode: response.body.bookingCode },
      });
      expect(saved).toMatchObject({
        id: response.body.id,
        roomId: room.id,
        nightsCount: 3,
        status: 'CONFIRMED',
        guestEmail: GUEST.email,
      });
      expect(saved.totalPrice.toNumber()).toBe(1050);
      expect(saved.checkIn.toISOString()).toBe('2030-06-10T00:00:00.000Z');
    });

    it('adds a one-off package surcharge to the price', async () => {
      const room = await createRoom(ctx.prisma, { pricePerNight: 350 });
      const spa = await createPackage(ctx.prisma, {
        name: 'Relaks SPA',
        priceModifier: 250,
        billingType: 'ONCE',
      });

      const response = await book(room.id, { packageId: spa.id }).expect(201);

      expect(response.body.totalPrice).toBe(1300);
      expect(response.body.package).toEqual({ id: spa.id, name: 'Relaks SPA' });
    });

    it('adds a per-night package surcharge to the price', async () => {
      const room = await createRoom(ctx.prisma, { pricePerNight: 350 });
      const fitness = await createPackage(ctx.prisma, {
        priceModifier: 80,
        billingType: 'PER_NIGHT',
      });

      const response = await book(room.id, { packageId: fitness.id }).expect(
        201,
      );

      expect(response.body.totalPrice).toBe(1290);
    });

    it('calculates prices with decimals exactly', async () => {
      const room = await createRoom(ctx.prisma, { pricePerNight: 349.99 });

      const response = await book(room.id).expect(201);

      expect(response.body.totalPrice).toBe(1049.97);
    });

    it('trims the guest data and accepts a null package', async () => {
      const room = await createRoom(ctx.prisma);

      const response = await book(room.id, {
        packageId: null,
        guestDetails: {
          ...GUEST,
          firstName: '  Jan  ',
          email: ' jan.kowalski@example.com ',
        },
      }).expect(201);

      expect(response.body.guestDetails).toMatchObject({
        firstName: 'Jan',
        email: 'jan.kowalski@example.com',
      });
      expect(response.body.package).toBeNull();
    });

    it('gives every booking a different code', async () => {
      const first = await createRoom(ctx.prisma);
      const second = await createRoom(ctx.prisma);

      const a = await book(first.id).expect(201);
      const b = await book(second.id).expect(201);

      expect(a.body.bookingCode).not.toBe(b.body.bookingCode);
    });

    it('makes the room unavailable in the search afterwards', async () => {
      const room = await createRoom(ctx.prisma);
      const dates = `checkIn=${STAY.checkIn}&checkOut=${STAY.checkOut}`;
      await book(room.id).expect(201);

      const search = await get(`/api/v1/rooms?${dates}`).expect(200);

      expect(search.body.data).toEqual([]);
      const details = await get(`/api/v1/rooms/${room.id}?${dates}`).expect(
        200,
      );
      expect(details.body.status).toBe('OCCUPIED');
    });

    describe('double booking protection', () => {
      it('answers 409 when the same dates are already booked', async () => {
        const room = await createRoom(ctx.prisma);
        await book(room.id).expect(201);

        const response = await book(room.id).expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          code: 'ROOM_NOT_AVAILABLE',
        });
        expect(await ctx.prisma.booking.count()).toBe(1);
      });

      it.each([
        ['inside the stay', '2030-06-11', '2030-06-12'],
        ['covering the stay', '2030-06-01', '2030-06-30'],
        ['overlapping the beginning', '2030-06-08', '2030-06-11'],
        ['overlapping the end', '2030-06-12', '2030-06-15'],
      ])('answers 409 for a booking %s', async (_label, checkIn, checkOut) => {
        const room = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, room.id, STAY);

        const response = await book(room.id, { checkIn, checkOut }).expect(409);

        expect(response.body.code).toBe('ROOM_NOT_AVAILABLE');
      });

      it('accepts a guest arriving on the day another guest leaves', async () => {
        const room = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, room.id, {
          checkIn: '2030-06-07',
          checkOut: STAY.checkIn,
        });

        await book(room.id).expect(201);
      });

      it('accepts a guest leaving on the day another guest arrives', async () => {
        const room = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, room.id, {
          checkIn: STAY.checkOut,
          checkOut: '2030-06-16',
        });

        await book(room.id).expect(201);
      });

      it('ignores cancelled bookings', async () => {
        const room = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, room.id, STAY, { status: 'CANCELLED' });

        await book(room.id).expect(201);
      });

      it('allows the same dates in a different room', async () => {
        const first = await createRoom(ctx.prisma);
        const second = await createRoom(ctx.prisma);
        await book(first.id).expect(201);

        await book(second.id).expect(201);
      });

      const expectOneWinner = async (
        responses: { status: number; body: { code?: string } }[],
        losers: number,
      ): Promise<void> => {
        const statuses = responses
          .map((response) => response.status)
          .sort((a, b) => a - b);
        expect(statuses).toEqual([201, ...Array<number>(losers).fill(409)]);
        for (const response of responses.filter(
          (item) => item.status === 409,
        )) {
          expect(response.body.code).toBe('ROOM_NOT_AVAILABLE');
        }
        expect(await ctx.prisma.booking.count()).toBe(1);
      };

      it('lets exactly one of many simultaneous requests win', async () => {
        const room = await createRoom(ctx.prisma);

        const responses = await Promise.all(
          Array.from({ length: 8 }, () => book(room.id)),
        );

        await expectOneWinner(responses, 7);
      });

      // Zwykłe równoległe żądania często i tak szeregują się na bazie, więc ten test wymusza wyścig: żadne żądanie
      // nie zapisuje rezerwacji, dopóki wszystkie nie sprawdzą, że pokój jest wolny. Tylko constraint w bazie
      // (reguła BR-2) uniemożliwia wtedy podwójną rezerwację i musi dać klientowi 409, a nie 500. (DamianTchorzewski_72206)
      it('answers 409, not 500, when every request already saw the room as free', async () => {
        const room = await createRoom(ctx.prisma);
        const requests = 8;
        const availability = ctx.app.get(RoomAvailabilityService);
        const original = availability.findOccupiedRoomIds.bind(availability);

        let arrived = 0;
        let openGate!: () => void;
        const gate = new Promise<void>((resolve) => {
          openGate = resolve;
        });
        const spy = vi
          .spyOn(availability, 'findOccupiedRoomIds')
          .mockImplementation(async (...args) => {
            const occupied = await original(...args);
            arrived += 1;
            if (arrived === requests) {
              openGate();
            }
            await gate;
            return occupied;
          });

        try {
          const responses = await Promise.all(
            Array.from({ length: requests }, () => book(room.id)),
          );

          expect(arrived).toBe(requests);
          await expectOneWinner(responses, requests - 1);
        } finally {
          spy.mockRestore();
        }
      });

      it('books all rooms when simultaneous requests target different rooms', async () => {
        const rooms = await Promise.all(
          Array.from({ length: 5 }, () => createRoom(ctx.prisma)),
        );

        const responses = await Promise.all(rooms.map((room) => book(room.id)));

        expect(responses.map((response) => response.status)).toEqual(
          Array(5).fill(201),
        );
      });
    });

    describe('business rules', () => {
      it('answers 422 when there are more guests than the room holds', async () => {
        const room = await createRoom(ctx.prisma, { capacity: 2 });

        const response = await book(room.id, { guestsCount: 3 }).expect(422);

        expect(response.body.code).toBe('GUESTS_EXCEED_CAPACITY');
        expect(await ctx.prisma.booking.count()).toBe(0);
      });

      it('answers 404 for an unknown room', async () => {
        const response = await book(
          'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
        ).expect(404);

        expect(response.body.code).toBe('ROOM_NOT_FOUND');
      });

      it('answers 404 for a room that is not offered', async () => {
        const room = await createRoom(ctx.prisma, { isActive: false });

        const response = await book(room.id).expect(404);

        expect(response.body.code).toBe('ROOM_NOT_FOUND');
      });

      it('answers 404 for an unknown package', async () => {
        const room = await createRoom(ctx.prisma);

        const response = await book(room.id, {
          packageId: '3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11',
        }).expect(404);

        expect(response.body.code).toBe('PACKAGE_NOT_FOUND');
      });

      it('answers 404 for a package that is not offered', async () => {
        const room = await createRoom(ctx.prisma);
        const hidden = await createPackage(ctx.prisma, { isActive: false });

        const response = await book(room.id, { packageId: hidden.id }).expect(
          404,
        );

        expect(response.body.code).toBe('PACKAGE_NOT_FOUND');
      });

      it('answers 400 for a check-in in the past', async () => {
        const room = await createRoom(ctx.prisma);

        const response = await book(room.id, {
          checkIn: '2020-01-01',
          checkOut: '2020-01-03',
        }).expect(400);

        expect(response.body).toMatchObject({
          code: 'VALIDATION_ERROR',
          details: [{ field: 'checkIn' }],
        });
      });

      it('does not save anything when a rule is violated', async () => {
        const room = await createRoom(ctx.prisma, { capacity: 1 });

        await book(room.id, { guestsCount: 2 }).expect(422);
        await book(room.id, { checkOut: STAY.checkIn }).expect(400);

        expect(await ctx.prisma.booking.count()).toBe(0);
      });

      it('ignores a price sent by the client', async () => {
        const room = await createRoom(ctx.prisma);

        const response = await book(room.id, { totalPrice: 1 }).expect(400);

        expect(response.body.details).toContainEqual({
          field: 'totalPrice',
          message: 'property totalPrice should not exist',
        });
      });
    });
  });
});
