import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';
import {
  BOOKING_CODE_EXAMPLE,
  BOOKING_CODE_PATTERN,
} from '../../../common/constants/booking.constants.js';
import { trimAndUpperCase } from '../../../common/transformers/string.transformers.js';

export class BookingCodeParamDto {
  @ApiProperty({
    description: 'Booking code. Letter case is ignored',
    example: BOOKING_CODE_EXAMPLE,
  })
  @Transform(trimAndUpperCase)
  @Matches(BOOKING_CODE_PATTERN, {
    message: 'bookingCode must match the format HTL-YYYY-XXXX',
  })
  bookingCode: string;
}
