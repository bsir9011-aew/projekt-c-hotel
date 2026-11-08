import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { HealthResponseDto } from './dto/health-response.dto.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Sprawdza, czy aplikacja działa i czy baza danych odpowiada na zapytania. (DamianTchorzewski_72206)
  async check(): Promise<HealthResponseDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : String(error),
      );
      const response: HealthResponseDto = {
        status: 'error',
        database: 'down',
        timestamp: new Date().toISOString(),
      };
      throw new ServiceUnavailableException(response);
    }

    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
