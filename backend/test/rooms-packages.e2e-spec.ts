import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';

describe('Rooms and packages request validation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /rooms rejects a single date with a field level error', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/rooms?checkIn=2026-11-15')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'checkOut' }],
    });
  });

  it('GET /rooms reports every invalid parameter', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/rooms?guests=0&minPrice=-5')
      .expect(400);

    const fields = response.body.details.map(
      (detail: { field: string }) => detail.field,
    );
    expect(fields).toEqual(['guests', 'minPrice']);
  });

  it('GET /rooms/:id rejects an id that is not a UUID', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/rooms/not-a-uuid')
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'id' }],
    });
  });
});
