import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_GUESTS_PER_BOOKING } from '../../../common/constants/booking.constants.js';
import { trim } from '../../../common/transformers/string.transformers.js';
import { IsCalendarDate } from '../../../common/validators/is-calendar-date.decorator.js';
import { IsDateAfter } from '../../../common/validators/is-date-after.decorator.js';
import { GuestDetailsDto } from './guest-details.dto.js';

export class CreateBookingDto {
  @ApiProperty({
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
  })
  @IsUUID()
  roomId: string;

  @ApiPropertyOptional({
    description: 'Optional holiday package. Omit it or send null for none',
    type: String,
    format: 'uuid',
    nullable: true,
    example: '3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11',
  })
  @IsOptional()
  @IsUUID()
  packageId?: string | null;

  @ApiProperty({
    description: 'Arrival date, YYYY-MM-DD. Must not be in the past',
    format: 'date',
    example: '2026-11-15',
  })
  @IsCalendarDate()
  checkIn: string;

  @ApiProperty({
    description: 'Departure date, YYYY-MM-DD. Must be later than checkIn',
    format: 'date',
    example: '2026-11-18',
  })
  @IsCalendarDate()
  @IsDateAfter('checkIn')
  checkOut: string;

  @ApiProperty({
    description: 'Number of guests. Must not exceed the capacity of the room',
    minimum: 1,
    maximum: MAX_GUESTS_PER_BOOKING,
    example: 2,
  })
  @Min(1)
  @Max(MAX_GUESTS_PER_BOOKING)
  @IsInt()
  guestsCount: number;

  @ApiProperty({ type: GuestDetailsDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => GuestDetailsDto)
  guestDetails: GuestDetailsDto;

  @ApiPropertyOptional({
    description:
      'Voucher code issued by the voucher team. Stored with the booking, no discount is applied yet',
    maxLength: 50,
    example: 'JESIEN2026',
  })
  @IsOptional()
  @Transform(trim)
  @Length(1, 50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message:
      'voucherCode may contain only letters, digits, hyphens and underscores',
  })
  @IsString()
  voucherCode?: string;
}
