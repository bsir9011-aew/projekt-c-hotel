import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;

  // Baza jest podstawiona atrapą, więc testy nie wymagają działającego PostgreSQL. (DamianTchorzewski_72206)
  const prismaMock = {
    $queryRaw: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  beforeEach(() => {
    prismaMock.$queryRaw.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns 200 when the database responds', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('GET /api/v1/health returns 503 when the database is down', async () => {
    // Błąd jest oczekiwany, więc wyciszamy log, żeby nie zaśmiecał wyniku testów. (DamianTchorzewski_72206)
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prismaMock.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503);

    expect(response.body).toMatchObject({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      path: '/api/v1/health',
    });
  });

  it('returns unknown routes in the standard error format', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/unknown?email=jan@example.com')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      code: 'NOT_FOUND',
      details: [],
    });
    // Query string nie może trafić do odpowiedzi, bo może zawierać dane osobowe. (DamianTchorzewski_72206)
    expect(response.body.path).toBe('/api/v1/unknown');
    expect(new Date(response.body.timestamp).toString()).not.toBe(
      'Invalid Date',
    );
  });

  it('serves the OpenAPI document under /api/docs-json', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(response.body.info.title).toBe('Hotel C REST API');
    expect(response.body.paths).toHaveProperty('/api/v1/health');
  });

  it('returns 404 for routes outside the /api/v1 prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('allows the configured frontend origin through CORS', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
  });

  it('does not allow other origins through CORS', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'http://evil.example')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-origin']).not.toBe(
      'http://evil.example',
    );
  });
});
