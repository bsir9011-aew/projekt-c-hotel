import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import { RoomDetailsQueryDto } from './dto/room-details-query.dto.js';
import { RoomDetailsDto } from './dto/room-details.dto.js';
import { RoomIdParamDto } from './dto/room-id-param.dto.js';
import { SearchRoomsQueryDto } from './dto/search-rooms-query.dto.js';
import { SearchRoomsResponseDto } from './dto/search-rooms-response.dto.js';
import { RoomsService } from './rooms.service.js';

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({
    summary: 'Search rooms',
    description:
      'Lists the rooms offered by the hotel. When dates are given, the response also contains the number of nights, the cost of the stay and the availability of every room. Dates must be given together, checkIn must not be in the past.',
  })
  @ApiOkResponse({ type: SearchRoomsResponseDto })
  @ApiErrorResponses({
    400: 'Invalid query parameters (VALIDATION_ERROR)',
  })
  search(@Query() query: SearchRoomsQueryDto): Promise<SearchRoomsResponseDto> {
    return this.roomsService.search(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get room details',
    description:
      'Returns the full description of a room. When dates are given, it also contains the availability, the cost of the stay and the price of every package for those dates.',
  })
  @ApiOkResponse({ type: RoomDetailsDto })
  @ApiErrorResponses({
    400: 'Invalid room id or dates (VALIDATION_ERROR)',
    404: 'The room does not exist or is not offered (ROOM_NOT_FOUND)',
  })
  findOne(
    @Param() params: RoomIdParamDto,
    @Query() query: RoomDetailsQueryDto,
  ): Promise<RoomDetailsDto> {
    return this.roomsService.findOne(params.id, query);
  }
}
