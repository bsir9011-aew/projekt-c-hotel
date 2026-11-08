import { nightsBetween } from '../../common/dates/date-utils.js';
import {
  calculatePackageCost,
  calculateRoomCost,
  toMoney,
} from '../../common/pricing/stay-pricing.js';
import type { Plain } from '../../common/types/plain.js';
import type { Package, Room } from '../../generated/prisma/client.js';
import { toPackageDto } from '../packages/packages.mapper.js';
import { RoomDetailsDto } from './dto/room-details.dto.js';
import { RoomBaseDto } from './dto/room-base.dto.js';
import { RoomSummaryDto } from './dto/room-summary.dto.js';
import type { StayDatesQueryDto } from './dto/stay-dates-query.dto.js';
import { RoomAvailabilityStatus } from './enums/room-availability-status.enum.js';
import { toShortDescription } from './short-description.js';

// Pobyt w zadanym terminie. Bez dat wszystkie pola zależne od terminu mają w odpowiedzi null. (DamianTchorzewski_72206)
export interface Stay {
  checkIn: string;
  checkOut: string;
  nights: number;
}

export function toStay(dates: StayDatesQueryDto): Stay | null {
  if (dates.checkIn === undefined || dates.checkOut === undefined) {
    return null;
  }

  return {
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    nights: nightsBetween(dates.checkIn, dates.checkOut),
  };
}

function toAvailability(
  stay: Stay | null,
  occupied: boolean,
): Pick<RoomSummaryDto, 'status' | 'isAvailable'> {
  if (stay === null) {
    return { status: null, isAvailable: null };
  }

  return occupied
    ? { status: RoomAvailabilityStatus.OCCUPIED, isAvailable: false }
    : { status: RoomAvailabilityStatus.AVAILABLE, isAvailable: true };
}

function toRoomBase(room: Room): Plain<RoomBaseDto> {
  return {
    id: room.id,
    roomNumber: room.roomNumber,
    name: room.name,
    pricePerNight: toMoney(room.pricePerNight),
    capacity: room.capacity,
    imageUrl: room.imageUrl,
    amenities: room.amenities,
  };
}

export function toRoomSummary(
  room: Room,
  stay: Stay | null,
  occupied: boolean,
): RoomSummaryDto {
  return {
    ...toRoomBase(room),
    shortDescription: toShortDescription(room.description),
    totalStayPrice: stay
      ? calculateRoomCost(room.pricePerNight, stay.nights)
      : null,
    ...toAvailability(stay, occupied),
  };
}

export function toRoomDetails(
  room: Room,
  packages: Package[],
  stay: Stay | null,
  occupied: boolean,
): RoomDetailsDto {
  return {
    ...toRoomBase(room),
    description: room.description,
    nightsCount: stay?.nights ?? null,
    totalStayPrice: stay
      ? calculateRoomCost(room.pricePerNight, stay.nights)
      : null,
    ...toAvailability(stay, occupied),
    availablePackages: packages.map((pkg) => ({
      ...toPackageDto(pkg),
      priceForStay: stay ? calculatePackageCost(pkg, stay.nights) : null,
    })),
  };
}
