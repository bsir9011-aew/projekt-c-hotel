import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';

describe('Bookings and integrations contract (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /bookings lists the missing fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      path: '/api/v1/bookings',
    });
    const fields = response.body.details.map(
      (detail: { field: string }) => detail.field,
    );
    expect(fields).toEqual([
      'roomId',
      'checkIn',
      'checkOut',
      'guestsCount',
      'guestDetails',
    ]);
  });

  it('POST /bookings rejects a client supplied price', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .send({ totalPrice: 1 })
      .expect(400);

    expect(response.body.details).toContainEqual({
      field: 'totalPrice',
      message: 'property totalPrice should not exist',
    });
  });

  it('POST /bookings/cancel rejects a malformed booking code', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings/cancel')
      .send({ bookingCode: 'abc', email: 'jan.kowalski@example.com' })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'bookingCode' }],
    });
  });

  it('GET /integrations/bookings/:code/verification rejects a malformed code', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/integrations/bookings/abc/verification')
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'bookingCode' }],
    });
  });

  it('GET /integrations/bookings/:code/verification rejects an invalid date', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/integrations/bookings/HTL-2026-X89B/verification?date=2026-02-30',
      )
      .expect(400);

    expect(response.body).toMatchObject({ details: [{ field: 'date' }] });
  });

  // Poniższe testy sprawdzają szkielety kontraktu. Zastąpią je testy logiki w zadaniu HOTEL-5. (DamianTchorzewski_72206)
  it('POST /bookings/cancel answers 501 for a valid request until it is implemented', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings/cancel')
      .send({ bookingCode: 'HTL-2026-X89B', email: 'jan.kowalski@example.com' })
      .expect(501);

    expect(response.body).toMatchObject({ code: 'NOT_IMPLEMENTED' });
  });

  it('GET /integrations/bookings/:code/verification answers 501 until it is implemented', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/integrations/bookings/HTL-2026-X89B/verification')
      .expect(501);

    expect(response.body).toMatchObject({ code: 'NOT_IMPLEMENTED' });
  });
});
