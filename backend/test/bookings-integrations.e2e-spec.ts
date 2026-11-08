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

  describe('GET /integrations/bookings/:code/verification', () => {
    // Klucz zgodny z INTEGRATION_API_KEYS w vitest.config.e2e.ts. (DamianTchorzewski_72206)
    const API_KEY = 'test-massage-key-0001';

    it('answers 401 without an API key, even for a malformed code', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/integrations/bookings/abc/verification')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        details: [],
      });
    });

    it('answers 401 for a wrong API key', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/integrations/bookings/HTL-2026-X89B/verification')
        .set('X-API-Key', 'definitely-wrong-key-0000')
        .expect(401);
    });

    it('rejects a malformed code once the key is accepted', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/integrations/bookings/abc/verification')
        .set('X-API-Key', API_KEY)
        .expect(400);

      expect(response.body).toMatchObject({
        code: 'VALIDATION_ERROR',
        details: [{ field: 'bookingCode' }],
      });
    });

    it('rejects an invalid date once the key is accepted', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/api/v1/integrations/bookings/HTL-2026-X89B/verification?date=2026-02-30',
        )
        .set('X-API-Key', API_KEY)
        .expect(400);

      expect(response.body).toMatchObject({ details: [{ field: 'date' }] });
    });
  });
});
