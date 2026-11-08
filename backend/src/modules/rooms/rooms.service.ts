import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-exception.js';
import { RoomDetailsQueryDto } from './dto/room-details-query.dto.js';
import { RoomDetailsDto } from './dto/room-details.dto.js';
import { SearchRoomsQueryDto } from './dto/search-rooms-query.dto.js';
import { SearchRoomsResponseDto } from './dto/search-rooms-response.dto.js';

@Injectable()
export class RoomsService {
  // Szkielet kontraktu: logika wyszukiwania zostanie dodana w zadaniu HOTEL-6. (DamianTchorzewski_72206)
  search(_query: SearchRoomsQueryDto): Promise<SearchRoomsResponseDto> {
    return Promise.reject(ApiException.notImplemented());
  }

  // Szkielet kontraktu: logika szczegółów pokoju zostanie dodana w zadaniu HOTEL-6. (DamianTchorzewski_72206)
  findOne(_id: string, _query: RoomDetailsQueryDto): Promise<RoomDetailsDto> {
    return Promise.reject(ApiException.notImplemented());
  }
}
