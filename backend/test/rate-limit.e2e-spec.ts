import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  CANCEL_RATE_LIMIT,
  INTEGRATION_RATE_LIMIT,
} from '../src/common/rate-limit/rate-limit.constants.js';
import { createTestApp } from './create-test-app.js';

// Ten plik jako jedyny włącza limit żądań. Zmienna musi być ustawiona, zanim moduł aplikacji odczyta konfigurację. (DamianTchorzewski_72206)
vi.hoisted(() => {
  process.env['RATE_LIMIT_ENABLED'] = 'true';
});

describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks cancellation attempts above the limit with 429', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/bookings/cancel')
        .send({ bookingCode: 'abc', email: 'jan.kowalski@example.com' });

    // Limit liczy każde żądanie, także to z błędną walidacją, więc zgadywanie kodów nie omija limitu. (DamianTchorzewski_72206)
    for (let i = 0; i < CANCEL_RATE_LIMIT; i += 1) {
      await attempt().expect(400);
    }
    const blocked = await attempt().expect(429);

    expect(blocked.body).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please try again later.',
      path: '/api/v1/bookings/cancel',
    });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('does not let the cancellation limit affect other endpoints', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('limits integration requests before the API key is checked', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .get('/api/v1/integrations/bookings/HTL-2026-X89B/verification')
        .set('X-API-Key', 'wrong-key-wrong-key-0000');

    for (let i = 0; i < INTEGRATION_RATE_LIMIT; i += 1) {
      await attempt().expect(401);
    }
    const blocked = await attempt().expect(429);

    expect(blocked.body.code).toBe('TOO_MANY_REQUESTS');
  });
});
