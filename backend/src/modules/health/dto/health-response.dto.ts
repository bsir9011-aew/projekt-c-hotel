import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status: 'ok' | 'error';

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  database: 'up' | 'down';

  @ApiProperty({ format: 'date-time', example: '2026-11-08T15:30:00.000Z' })
  timestamp: string;
}
