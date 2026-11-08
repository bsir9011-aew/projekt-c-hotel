import { ApiProperty } from '@nestjs/swagger';
import { RoomSummaryDto } from './room-summary.dto.js';

export class SearchRoomsMetaDto {
  @ApiProperty({
    format: 'date',
    nullable: true,
    type: String,
    example: '2026-11-15',
  })
  checkIn: string | null;

  @ApiProperty({
    format: 'date',
    nullable: true,
    type: String,
    example: '2026-11-18',
  })
  checkOut: string | null;

  @ApiProperty({
    description: 'Number of nights. Null when no dates were given',
    nullable: true,
    type: Number,
    example: 3,
  })
  nightsCount: number | null;

  @ApiProperty({
    description: 'The guests filter echoed back. Null when it was not given',
    nullable: true,
    type: Number,
    example: 2,
  })
  guests: number | null;

  @ApiProperty({ description: 'Number of rooms in data', example: 1 })
  totalResults: number;
}

export class SearchRoomsResponseDto {
  @ApiProperty({ type: SearchRoomsMetaDto })
  meta: SearchRoomsMetaDto;

  @ApiProperty({ type: [RoomSummaryDto] })
  data: RoomSummaryDto[];
}
