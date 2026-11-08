import { ApiProperty } from '@nestjs/swagger';
import { RoomAvailabilityStatus } from '../enums/room-availability-status.enum.js';
import { RoomBaseDto } from './room-base.dto.js';
import { RoomPackageOptionDto } from './room-package-option.dto.js';

export class RoomDetailsDto extends RoomBaseDto {
  @ApiProperty({
    example:
      'Przestronny pokój z widokiem na ogród, dużym łóżkiem małżeńskim i własną łazienką.',
  })
  description: string;

  @ApiProperty({
    description: 'Number of nights. Null when no dates were given',
    type: Number,
    nullable: true,
    example: 3,
  })
  nightsCount: number | null;

  @ApiProperty({
    description:
      'Cost of the room for the whole stay in PLN. Null when no dates were given',
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

  @ApiProperty({
    description: 'Active packages that can be added to a booking of this room',
    type: [RoomPackageOptionDto],
  })
  availablePackages: RoomPackageOptionDto[];
}
