import { Test } from '@nestjs/testing';
import { HealthResponseDto } from './dto/health-response.dto.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  const check = vi.fn();
  let controller: HealthController;

  beforeEach(async () => {
    check.mockReset();

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: { check } }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('returns the status provided by HealthService', async () => {
    const expected: HealthResponseDto = {
      status: 'ok',
      database: 'up',
      timestamp: '2026-11-08T15:30:00.000Z',
    };
    check.mockResolvedValue(expected);

    await expect(controller.check()).resolves.toEqual(expected);
  });
});
