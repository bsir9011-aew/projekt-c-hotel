import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsCalendarDate } from '../../../common/validators/is-calendar-date.decorator.js';

export class VerifyBookingQueryDto {
  @ApiPropertyOptional({
    description:
      "Day for which the stay is checked, YYYY-MM-DD. Defaults to today in the hotel's time zone (Europe/Warsaw)",
    format: 'date',
    example: '2026-11-16',
  })
  @IsOptional()
  @IsCalendarDate()
  date?: string;
}
