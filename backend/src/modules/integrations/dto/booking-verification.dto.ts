import { ApiProperty } from '@nestjs/swagger';
import { BOOKING_CODE_EXAMPLE } from '../../../common/constants/booking.constants.js';
import { BookingStatus } from '../../bookings/enums/booking-status.enum.js';

export class VerifiedPackageDto {
  @ApiProperty({
    format: 'uuid',
    example: '3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11',
  })
  id: string;

  @ApiProperty({ example: 'Pakiet Relaks SPA' })
  name: string;

  @ApiProperty({
    description: 'Stable codes of the services the guest is entitled to',
    type: [String],
    example: ['MASSAGE_RELAX_60', 'SPA_ACCESS'],
  })
  includedServices: string[];
}

// Odpowiedź celowo nie zawiera danych osobowych gościa, bo kod rezerwacji jest jedynym zabezpieczeniem. (DamianTchorzewski_72206)
export class BookingVerificationDto {
  @ApiProperty({ example: BOOKING_CODE_EXAMPLE })
  bookingCode: string;

  @ApiProperty({
    enum: BookingStatus,
    enumName: 'BookingStatus',
    example: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @ApiProperty({
    description: 'The day for which the stay was checked',
    format: 'date',
    example: '2026-11-16',
  })
  date: string;

  @ApiProperty({
    description:
      'True when the booking is CONFIRMED and checkIn <= date <= checkOut. The departure day still counts as active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({ format: 'date', example: '2026-11-15' })
  checkIn: string;

  @ApiProperty({ format: 'date', example: '2026-11-18' })
  checkOut: string;

  @ApiProperty({ example: 2 })
  guestsCount: number;

  @ApiProperty({
    description: 'Package bought with the booking, null when there is none',
    type: VerifiedPackageDto,
    nullable: true,
  })
  package: VerifiedPackageDto | null;
}
