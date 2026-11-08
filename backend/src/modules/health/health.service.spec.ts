import { HttpStatus, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiErrorCode } from '../../common/errors/api-error-code.enum.js';
import { ApiException } from '../../common/errors/api-exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const queryRaw = vi.fn();
  let service: HealthService;

  beforeEach(async () => {
    queryRaw.mockReset();
    // Błąd jest oczekiwany w jednym z testów, więc wyciszamy log. (DamianTchorzewski_72206)
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports the database as up when the query succeeds', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('throws a 503 ApiException when the database is unreachable', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    const error: unknown = await service.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect((error as ApiException).code).toBe(ApiErrorCode.SERVICE_UNAVAILABLE);
  });
});
