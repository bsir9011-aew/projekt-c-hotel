import { ApiProperty } from '@nestjs/swagger';
import { RoomAvailabilityStatus } from '../enums/room-availability-status.enum.js';
import { RoomBaseDto } from './room-base.dto.js';

export class RoomSummaryDto extends RoomBaseDto {
  @ApiProperty({
    description:
      'Short description, up to 160 characters, derived from the full description',
    example: 'Komfortowy pokój z widokiem na ogród i dużym łóżkiem małżeńskim.',
  })
  shortDescription: string;

  @ApiProperty({
    description:
      'Cost of the room for the whole stay in PLN (nightsCount * pricePerNight). Null when no dates were given',
    type: Number,
    nullable: true,
    example: 1050,
  })
  totalStayPrice: number | null;

  @ApiProperty({
    description:
      'Availability for the requested dates. Null when no dates were given',
    enum: RoomAvailabilityStatus,
    enumName: 'RoomAvailabilityStatus',
    nullable: true,
    example: RoomAvailabilityStatus.AVAILABLE,
  })
  status: RoomAvailabilityStatus | null;

  @ApiProperty({
    description:
      'Convenience flag equal to status === AVAILABLE. Null when no dates were given',
    type: Boolean,
    nullable: true,
    example: true,
  })
  isAvailable: boolean | null;
}
