import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { MAX_GUESTS_PER_BOOKING } from '../../../common/constants/booking.constants.js';
import { StayDatesQueryDto } from './stay-dates-query.dto.js';

// Parametry zapytania są tekstem, więc "true" i "false" trzeba zamienić na wartości logiczne. (DamianTchorzewski_72206)
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class SearchRoomsQueryDto extends StayDatesQueryDto {
  @ApiPropertyOptional({
    description:
      'Number of guests. Only rooms with capacity >= guests are returned',
    minimum: 1,
    maximum: MAX_GUESTS_PER_BOOKING,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(MAX_GUESTS_PER_BOOKING)
  @IsInt()
  guests?: number;

  @ApiPropertyOptional({
    description: 'Minimum price per night in PLN',
    minimum: 0,
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  minPrice?: number;

  @ApiPropertyOptional({
    description:
      'Maximum price per night in PLN. Must not be lower than minPrice',
    minimum: 0,
    example: 600,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  maxPrice?: number;

  @ApiPropertyOptional({
    description:
      'When true, occupied rooms are left out. Defaults to true if dates are given. Ignored without dates',
    type: Boolean,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  onlyAvailable?: boolean;
}
