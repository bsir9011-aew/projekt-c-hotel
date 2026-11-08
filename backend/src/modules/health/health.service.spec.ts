import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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

  it('throws ServiceUnavailableException when the database is unreachable', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
