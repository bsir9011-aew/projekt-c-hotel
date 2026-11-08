import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  BOOKING_CODE_EXAMPLE,
  BOOKING_CODE_PATTERN,
} from '../../../common/constants/booking.constants.js';
import {
  trim,
  trimAndUpperCase,
} from '../../../common/transformers/string.transformers.js';

export class CancelBookingDto {
  @ApiProperty({
    description:
      'Booking code received after the booking. Letter case is ignored',
    example: BOOKING_CODE_EXAMPLE,
  })
  @Transform(trimAndUpperCase)
  @Matches(BOOKING_CODE_PATTERN, {
    message: 'bookingCode must match the format HTL-YYYY-XXXX',
  })
  bookingCode: string;

  @ApiProperty({
    description: 'E-mail address given when the booking was made',
    format: 'email',
    example: 'jan.kowalski@example.com',
  })
  @Transform(trim)
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Optional reason of the cancellation',
    maxLength: 500,
    example: 'Zmiana planów wyjazdowych',
  })
  @IsOptional()
  @Transform(trim)
  @MaxLength(500)
  @IsString()
  reason?: string;
}
