import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error-code.enum.js';
import { ApiException } from '../../common/errors/api-exception.js';
import type { ErrorDetailDto } from '../../common/errors/error-response.dto.js';
import { checkInInPastDetails } from '../../common/validation/stay-rules.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PackagesService } from '../packages/packages.service.js';
import { RoomDetailsQueryDto } from './dto/room-details-query.dto.js';
import { RoomDetailsDto } from './dto/room-details.dto.js';
import { SearchRoomsQueryDto } from './dto/search-rooms-query.dto.js';
import { SearchRoomsResponseDto } from './dto/search-rooms-response.dto.js';
import { RoomAvailabilityService } from './room-availability.service.js';
import { toRoomDetails, toRoomSummary, toStay } from './rooms.mapper.js';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: RoomAvailabilityService,
    private readonly packages: PackagesService,
  ) {}

  async search(query: SearchRoomsQueryDto): Promise<SearchRoomsResponseDto> {
    this.assertSearchRules(query);

    const stay = toStay(query);
    const rooms = await this.prisma.room.findMany({
      where: this.buildWhere(query),
      orderBy: [{ pricePerNight: 'asc' }, { roomNumber: 'asc' }],
    });

    // Dostępność jest wyliczana z rezerwacji tylko wtedy, gdy podano daty (reguła BR-1). (DamianTchorzewski_72206)
    const occupied = stay
      ? await this.availability.findOccupiedRoomIds(
          rooms.map((room) => room.id),
          stay.checkIn,
          stay.checkOut,
        )
      : new Set<string>();

    // Domyślnie, gdy podano daty, zajęte pokoje są pomijane. onlyAvailable=false pokazuje je ze statusem OCCUPIED. (DamianTchorzewski_72206)
    const onlyAvailable = stay !== null && (query.onlyAvailable ?? true);
    const visible = onlyAvailable
      ? rooms.filter((room) => !occupied.has(room.id))
      : rooms;

    return {
      meta: {
        checkIn: stay?.checkIn ?? null,
        checkOut: stay?.checkOut ?? null,
        nightsCount: stay?.nights ?? null,
        guests: query.guests ?? null,
        totalResults: visible.length,
      },
      data: visible.map((room) =>
        toRoomSummary(room, stay, occupied.has(room.id)),
      ),
    };
  }

  async findOne(
    id: string,
    query: RoomDetailsQueryDto,
  ): Promise<RoomDetailsDto> {
    const pastDetails = checkInInPastDetails(query.checkIn);
    if (pastDetails.length > 0) {
      throw ApiException.validation(pastDetails);
    }

    // Pokój wyłączony z oferty traktujemy jak nieistniejący dla klienta. (DamianTchorzewski_72206)
    const room = await this.prisma.room.findFirst({
      where: { id, isActive: true },
    });
    if (!room) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.ROOM_NOT_FOUND,
        'The room does not exist or is not offered.',
      );
    }

    const stay = toStay(query);
    const occupied = stay
      ? (
          await this.availability.findOccupiedRoomIds(
            [room.id],
            stay.checkIn,
            stay.checkOut,
          )
        ).has(room.id)
      : false;

    return toRoomDetails(
      room,
      await this.packages.findActive(),
      stay,
      occupied,
    );
  }

  // Reguły, które zależą od zegara albo od kilku pól naraz, więc nie mieszczą się w samym DTO. (DamianTchorzewski_72206)
  private assertSearchRules(query: SearchRoomsQueryDto): void {
    const details: ErrorDetailDto[] = checkInInPastDetails(query.checkIn);

    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      details.push({
        field: 'maxPrice',
        message: 'maxPrice must not be lower than minPrice',
      });
    }

    if (details.length > 0) {
      throw ApiException.validation(details);
    }
  }

  private buildWhere(query: SearchRoomsQueryDto): Prisma.RoomWhereInput {
    return {
      isActive: true,
      capacity: { gte: query.guests },
      pricePerNight: { gte: query.minPrice, lte: query.maxPrice },
    };
  }
}
