import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateIf } from 'class-validator';
import { IsCalendarDate } from '../../../common/validators/is-calendar-date.decorator.js';
import { IsDateAfter } from '../../../common/validators/is-date-after.decorator.js';

// Daty pobytu podaje się razem albo wcale, więc podanie jednej z nich włącza walidację obu. (DamianTchorzewski_72206)
function isAnyDateProvided(query: StayDatesQueryDto): boolean {
  return query.checkIn !== undefined || query.checkOut !== undefined;
}

export class StayDatesQueryDto {
  @ApiPropertyOptional({
    description:
      'Arrival date, YYYY-MM-DD. Must be given together with checkOut',
    format: 'date',
    example: '2026-11-15',
  })
  @ValidateIf(isAnyDateProvided)
  @IsCalendarDate()
  checkIn?: string;

  @ApiPropertyOptional({
    description:
      'Departure date, YYYY-MM-DD. Must be later than checkIn and given together with it',
    format: 'date',
    example: '2026-11-18',
  })
  @ValidateIf(isAnyDateProvided)
  @IsCalendarDate()
  @IsDateAfter('checkIn')
  checkOut?: string;
}
