import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { HealthResponseDto } from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check application and database status' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiErrorResponses({ 503: 'The database is unreachable' })
  check(): Promise<HealthResponseDto> {
    return this.healthService.check();
  }
}
