import { ApiProperty } from '@nestjs/swagger';
import { BOOKING_CODE_EXAMPLE } from '../../../common/constants/booking.constants.js';
import { BookingStatus } from '../enums/booking-status.enum.js';
import { GuestDetailsDto } from './guest-details.dto.js';

export class BookingRoomDto {
  @ApiProperty({
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({ example: 'Pokój Standard Dwuosobowy' })
  name: string;

  @ApiProperty({ example: '101' })
  roomNumber: string;
}

export class BookingPackageDto {
  @ApiProperty({
    format: 'uuid',
    example: '3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11',
  })
  id: string;

  @ApiProperty({ example: 'Pakiet Relaks SPA' })
  name: string;
}

export class BookingDto {
  @ApiProperty({
    format: 'uuid',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'Code used to verify or cancel the booking without an account',
    example: BOOKING_CODE_EXAMPLE,
  })
  bookingCode: string;

  @ApiProperty({
    enum: BookingStatus,
    enumName: 'BookingStatus',
    example: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @ApiProperty({ type: BookingRoomDto })
  room: BookingRoomDto;

  @ApiProperty({
    description: 'Selected holiday package, null when none was chosen',
    type: BookingPackageDto,
    nullable: true,
  })
  package: BookingPackageDto | null;

  @ApiProperty({ format: 'date', example: '2026-11-15' })
  checkIn: string;

  @ApiProperty({ format: 'date', example: '2026-11-18' })
  checkOut: string;

  @ApiProperty({ example: 3 })
  nightsCount: number;

  @ApiProperty({ example: 2 })
  guestsCount: number;

  @ApiProperty({
    description:
      'Total price of the stay in PLN: rooms for all nights plus the package surcharge',
    example: 1300,
  })
  totalPrice: number;

  @ApiProperty({ type: GuestDetailsDto })
  guestDetails: GuestDetailsDto;

  @ApiProperty({ type: String, nullable: true, example: 'JESIEN2026' })
  voucherCode: string | null;

  @ApiProperty({ format: 'date-time', example: '2026-11-08T15:30:00.000Z' })
  createdAt: string;

  @ApiProperty({
    description: 'Moment of the cancellation, null for an active booking',
    format: 'date-time',
    type: String,
    nullable: true,
    example: null,
  })
  cancelledAt: string | null;

  @ApiProperty({
    description: 'Reason given while cancelling, null when none was given',
    type: String,
    nullable: true,
    example: null,
  })
  cancelReason: string | null;
}
