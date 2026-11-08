import request from 'supertest';
import { createBooking, createPackage, createRoom } from './fixtures.js';
import {
  createIntegrationApp,
  resetDatabase,
  type IntegrationApp,
} from './test-app.js';

// Daty z odległej przyszłości, aby reguła "przyjazd nie z przeszłości" nigdy nie zepsuła testów. (DamianTchorzewski_72206)
const STAY = { checkIn: '2030-06-10', checkOut: '2030-06-13' };
const DATES = `checkIn=${STAY.checkIn}&checkOut=${STAY.checkOut}`;

describe('Rooms and packages (integration, real PostgreSQL)', () => {
  let ctx: IntegrationApp;

  const get = (path: string) => request(ctx.app.getHttpServer()).get(path);
  const ids = (body: { data: { id: string }[] }) =>
    body.data.map((room) => room.id);

  beforeAll(async () => {
    ctx = await createIntegrationApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('GET /rooms', () => {
    it('returns only active rooms, cheapest first, then by number', async () => {
      const expensive = await createRoom(ctx.prisma, {
        roomNumber: '300',
        pricePerNight: 500,
      });
      const cheapB = await createRoom(ctx.prisma, {
        roomNumber: '202',
        pricePerNight: 200,
      });
      const cheapA = await createRoom(ctx.prisma, {
        roomNumber: '201',
        pricePerNight: 200,
      });
      await createRoom(ctx.prisma, { isActive: false, pricePerNight: 50 });

      const response = await get('/api/v1/rooms').expect(200);

      expect(ids(response.body)).toEqual([cheapA.id, cheapB.id, expensive.id]);
      expect(response.body.meta.totalResults).toBe(3);
    });

    it('filters by the number of guests', async () => {
      await createRoom(ctx.prisma, { capacity: 1 });
      const family = await createRoom(ctx.prisma, { capacity: 4 });

      const response = await get('/api/v1/rooms?guests=3').expect(200);

      expect(ids(response.body)).toEqual([family.id]);
      expect(response.body.meta.guests).toBe(3);
    });

    it('filters by the price per night, inclusive on both ends', async () => {
      await createRoom(ctx.prisma, { pricePerNight: 199.99 });
      const low = await createRoom(ctx.prisma, { pricePerNight: 200 });
      const high = await createRoom(ctx.prisma, { pricePerNight: 400 });
      await createRoom(ctx.prisma, { pricePerNight: 400.01 });

      const response = await get(
        '/api/v1/rooms?minPrice=200&maxPrice=400',
      ).expect(200);

      expect(ids(response.body)).toEqual([low.id, high.id]);
    });

    it('returns null stay fields when no dates are given', async () => {
      await createRoom(ctx.prisma);

      const response = await get('/api/v1/rooms').expect(200);

      expect(response.body.meta).toMatchObject({
        checkIn: null,
        checkOut: null,
        nightsCount: null,
      });
      expect(response.body.data[0]).toMatchObject({
        totalStayPrice: null,
        status: null,
        isAvailable: null,
      });
    });

    it('prices the stay and returns money as numbers', async () => {
      await createRoom(ctx.prisma, { pricePerNight: 349.99 });

      const response = await get(`/api/v1/rooms?${DATES}`).expect(200);

      expect(response.body.meta).toMatchObject({
        checkIn: STAY.checkIn,
        checkOut: STAY.checkOut,
        nightsCount: 3,
      });
      expect(response.body.data[0].pricePerNight).toBe(349.99);
      expect(response.body.data[0].totalStayPrice).toBe(1049.97);
    });

    describe('availability (rule BR-1)', () => {
      it('hides a room with a confirmed booking in the same dates', async () => {
        const busy = await createRoom(ctx.prisma);
        const free = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, busy.id, STAY);

        const response = await get(`/api/v1/rooms?${DATES}`).expect(200);

        expect(ids(response.body)).toEqual([free.id]);
        expect(response.body.data[0]).toMatchObject({
          status: 'AVAILABLE',
          isAvailable: true,
        });
      });

      it.each([
        ['a booking inside the stay', '2030-06-11', '2030-06-12'],
        ['a booking covering the whole stay', '2030-06-01', '2030-06-30'],
        ['a booking overlapping the beginning', '2030-06-08', '2030-06-11'],
        ['a booking overlapping the end', '2030-06-12', '2030-06-15'],
      ])('treats %s as occupied', async (_label, checkIn, checkOut) => {
        const room = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, room.id, { checkIn, checkOut });

        const response = await get(`/api/v1/rooms?${DATES}`).expect(200);

        expect(ids(response.body)).toEqual([]);
      });

      it('keeps a room available when another guest leaves on the arrival day', async () => {
        const room = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, room.id, {
          checkIn: '2030-06-07',
          checkOut: STAY.checkIn,
        });

        const response = await get(`/api/v1/rooms?${DATES}`).expect(200);

        expect(ids(response.body)).toEqual([room.id]);
      });

      it('keeps a room available when another guest arrives on the departure day', async () => {
        const room = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, room.id, {
          checkIn: STAY.checkOut,
          checkOut: '2030-06-16',
        });

        const response = await get(`/api/v1/rooms?${DATES}`).expect(200);

        expect(ids(response.body)).toEqual([room.id]);
      });

      it('ignores cancelled bookings', async () => {
        const room = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, room.id, STAY, {
          status: 'CANCELLED',
        });

        const response = await get(`/api/v1/rooms?${DATES}`).expect(200);

        expect(ids(response.body)).toEqual([room.id]);
      });

      it('does not let a booking of one room hide another room', async () => {
        const busy = await createRoom(ctx.prisma);
        const other = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, busy.id, STAY);

        const response = await get(
          `/api/v1/rooms?${DATES}&onlyAvailable=false`,
        ).expect(200);

        const byId = Object.fromEntries(
          response.body.data.map((room: { id: string; status: string }) => [
            room.id,
            room.status,
          ]),
        );
        expect(byId).toEqual({
          [busy.id]: 'OCCUPIED',
          [other.id]: 'AVAILABLE',
        });
      });

      it('lists occupied rooms when onlyAvailable is false', async () => {
        const busy = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, busy.id, STAY);

        const response = await get(
          `/api/v1/rooms?${DATES}&onlyAvailable=false`,
        ).expect(200);

        expect(response.body.data[0]).toMatchObject({
          id: busy.id,
          status: 'OCCUPIED',
          isAvailable: false,
        });
      });

      it('shows a room as free in other dates even when it is occupied today', async () => {
        const room = await createRoom(ctx.prisma);
        await createBooking(ctx.prisma, room.id, STAY);

        const response = await get(
          '/api/v1/rooms?checkIn=2030-07-01&checkOut=2030-07-03',
        ).expect(200);

        expect(ids(response.body)).toEqual([room.id]);
      });
    });

    it('rejects a check-in in the past', async () => {
      const response = await get(
        '/api/v1/rooms?checkIn=2020-01-01&checkOut=2020-01-03',
      ).expect(400);

      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        details: [{ field: 'checkIn' }],
      });
    });

    it('rejects minPrice greater than maxPrice', async () => {
      const response = await get(
        '/api/v1/rooms?minPrice=500&maxPrice=100',
      ).expect(400);

      expect(response.body.details).toEqual([
        {
          field: 'maxPrice',
          message: 'maxPrice must not be lower than minPrice',
        },
      ]);
    });
  });

  describe('GET /rooms/:id', () => {
    it('returns the full description, stay price and priced packages', async () => {
      const room = await createRoom(ctx.prisma, {
        pricePerNight: 350,
        description: 'Pełny opis pokoju.',
      });
      await createPackage(ctx.prisma, {
        name: 'B nightly',
        priceModifier: 80,
        billingType: 'PER_NIGHT',
      });
      await createPackage(ctx.prisma, {
        name: 'A once',
        priceModifier: 250,
        billingType: 'ONCE',
      });
      await createPackage(ctx.prisma, { name: 'Inactive', isActive: false });

      const response = await get(`/api/v1/rooms/${room.id}?${DATES}`).expect(
        200,
      );

      expect(response.body).toMatchObject({
        id: room.id,
        description: 'Pełny opis pokoju.',
        nightsCount: 3,
        totalStayPrice: 1050,
        status: 'AVAILABLE',
        isAvailable: true,
      });
      expect(
        response.body.availablePackages.map(
          (item: { name: string; priceForStay: number }) => [
            item.name,
            item.priceForStay,
          ],
        ),
      ).toEqual([
        ['A once', 250],
        ['B nightly', 240],
      ]);
    });

    it('returns null stay fields without dates', async () => {
      const room = await createRoom(ctx.prisma);
      await createPackage(ctx.prisma);

      const response = await get(`/api/v1/rooms/${room.id}`).expect(200);

      expect(response.body).toMatchObject({
        nightsCount: null,
        totalStayPrice: null,
        status: null,
        isAvailable: null,
      });
      expect(response.body.availablePackages[0].priceForStay).toBeNull();
    });

    it('marks the room as occupied but still returns it', async () => {
      const room = await createRoom(ctx.prisma);
      await createBooking(ctx.prisma, room.id, STAY);

      const response = await get(`/api/v1/rooms/${room.id}?${DATES}`).expect(
        200,
      );

      expect(response.body).toMatchObject({
        status: 'OCCUPIED',
        isAvailable: false,
      });
    });

    it('answers 404 for an unknown room', async () => {
      const response = await get(
        '/api/v1/rooms/a1b2c3d4-e5f6-4890-abcd-ef1234567890',
      ).expect(404);

      expect(response.body.code).toBe('ROOM_NOT_FOUND');
    });

    it('answers 404 for a room that is not offered', async () => {
      const room = await createRoom(ctx.prisma, { isActive: false });

      const response = await get(`/api/v1/rooms/${room.id}`).expect(404);

      expect(response.body.code).toBe('ROOM_NOT_FOUND');
    });
  });

  describe('GET /packages', () => {
    it('returns active packages sorted by name with prices as numbers', async () => {
      await createPackage(ctx.prisma, {
        name: 'Zeta',
        priceModifier: 79.9,
        billingType: 'PER_NIGHT',
        includedServices: ['FITNESS_DAY_PASS'],
      });
      await createPackage(ctx.prisma, { name: 'Alfa', priceModifier: 250 });
      await createPackage(ctx.prisma, { name: 'Hidden', isActive: false });

      const response = await get('/api/v1/packages').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        name: 'Alfa',
        priceModifier: 250,
        billingType: 'ONCE',
      });
      expect(response.body.data[1]).toMatchObject({
        name: 'Zeta',
        priceModifier: 79.9,
        billingType: 'PER_NIGHT',
        includedServices: ['FITNESS_DAY_PASS'],
      });
    });

    it('returns an empty list when there are no packages', async () => {
      const response = await get('/api/v1/packages').expect(200);

      expect(response.body).toEqual({ data: [] });
    });
  });
});
