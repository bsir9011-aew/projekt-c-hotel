import { ApiProperty } from '@nestjs/swagger';

// Odpowiedź 200: awarię bazy sygnalizuje status 503 w standardowym formacie błędu. (DamianTchorzewski_72206)
export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status: 'ok';

  @ApiProperty({ enum: ['up'], example: 'up' })
  database: 'up';

  @ApiProperty({ format: 'date-time', example: '2026-11-08T15:30:00.000Z' })
  timestamp: string;
}
