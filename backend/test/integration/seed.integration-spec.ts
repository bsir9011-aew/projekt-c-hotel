import request from 'supertest';
import { addDays, todayInHotel } from '../../src/common/dates/date-utils.js';
import {
  DEMO_BOOKINGS,
  DEMO_PACKAGES,
  DEMO_ROOMS,
  EXAMPLE_ROOM_ID,
  SPA_PACKAGE_ID,
  seedDatabase,
} from '../../prisma/seed-data.js';
import {
  createIntegrationApp,
  resetDatabase,
  type IntegrationApp,
} from './test-app.js';

describe('Seed (integration, real PostgreSQL)', () => {
  let ctx: IntegrationApp;

  beforeAll(async () => {
    ctx = await createIntegrationApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('can be run repeatedly without duplicating data', async () => {
    const first = await seedDatabase(ctx.prisma);
    const second = await seedDatabase(ctx.prisma);

    expect(second).toEqual(first);
    expect(await ctx.prisma.room.count()).toBe(DEMO_ROOMS.length);
    expect(await ctx.prisma.package.count()).toBe(DEMO_PACKAGES.length);
    expect(await ctx.prisma.booking.count()).toBe(DEMO_BOOKINGS.length);
  });

  it('keeps the identifiers used in the examples of the API contract', async () => {
    await seedDatabase(ctx.prisma);

    const room = await request(ctx.app.getHttpServer())
      .get(`/api/v1/rooms/${EXAMPLE_ROOM_ID}`)
      .expect(200);
    const packages = await request(ctx.app.getHttpServer())
      .get('/api/v1/packages')
      .expect(200);

    expect(room.body.name).toBe('Pokój Standard Dwuosobowy');
    expect(packages.body.data.map((item: { id: string }) => item.id)).toContain(
      SPA_PACKAGE_ID,
    );
  });

  it('offers the rooms known from the frontend prototype', async () => {
    await seedDatabase(ctx.prisma);

    const response = await request(ctx.app.getHttpServer())
      .get('/api/v1/rooms')
      .expect(200);
    const known = response.body.data
      .filter((room: { roomNumber: string }) =>
        ['102', '103', '201'].includes(room.roomNumber),
      )
      .map(
        (room: { name: string; capacity: number; pricePerNight: number }) => [
          room.name,
          room.capacity,
          room.pricePerNight,
        ],
      );

    expect(known).toEqual([
      ['Pokój jednoosobowy', 1, 220],
      ['Pokój dwuosobowy', 2, 320],
      ['Apartament rodzinny', 4, 550],
    ]);
    // 10 aktywnych pokoi, a pokój w remoncie (999) jest pomijany. (DamianTchorzewski_72206)
    expect(response.body.data).toHaveLength(10);
  });

  it('makes a demo room occupied during its demo booking', async () => {
    await seedDatabase(ctx.prisma);
    const checkIn = addDays(todayInHotel(), 14);
    const checkOut = addDays(checkIn, 3);

    const response = await request(ctx.app.getHttpServer())
      .get(
        `/api/v1/rooms?checkIn=${checkIn}&checkOut=${checkOut}&onlyAvailable=false`,
      )
      .expect(200);

    const statusOf = (roomNumber: string): string =>
      response.body.data.find(
        (room: { roomNumber: string }) => room.roomNumber === roomNumber,
      ).status;
    expect(statusOf('103')).toBe('OCCUPIED');
    expect(statusOf('102')).toBe('AVAILABLE');
  });

  // Rezerwacje demo opisane w README muszą naprawdę działać, bo służą do ręcznych testów w Swaggerze i Insomnii. (DamianTchorzewski_72206)
  it('lets a partner verify the demo stay that is in progress', async () => {
    await seedDatabase(ctx.prisma);

    const response = await request(ctx.app.getHttpServer())
      .get('/api/v1/integrations/bookings/HTL-2026-DM4C/verification')
      .set('X-API-Key', 'test-fitness-key-0002')
      .expect(200);

    expect(response.body).toMatchObject({
      isActive: true,
      status: 'CONFIRMED',
      package: { includedServices: ['FITNESS_DAY_PASS', 'FITNESS_TRAINER_30'] },
    });
  });

  it('lets a guest cancel a future demo booking but not the one in progress', async () => {
    await seedDatabase(ctx.prisma);
    const cancel = (bookingCode: string, email: string) =>
      request(ctx.app.getHttpServer())
        .post('/api/v1/bookings/cancel')
        .send({ bookingCode, email });

    await cancel('HTL-2026-DM2A', 'anna.demo@example.com').expect(200);
    await cancel('HTL-2026-DM4C', 'ewa.demo@example.com').expect(422);
  });

  it('includes a stay that is already in progress', async () => {
    await seedDatabase(ctx.prisma);
    const today = todayInHotel();

    const response = await request(ctx.app.getHttpServer())
      .get(
        `/api/v1/rooms?checkIn=${today}&checkOut=${addDays(today, 1)}&onlyAvailable=false`,
      )
      .expect(200);

    const room105 = response.body.data.find(
      (room: { roomNumber: string }) => room.roomNumber === '105',
    );
    expect(room105.status).toBe('OCCUPIED');
  });
});
