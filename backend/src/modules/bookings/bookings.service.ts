import { Injectable } from '@nestjs/common';
import {
  nightsBetween,
  parseDateOnly,
  todayInHotel,
} from '../../common/dates/date-utils.js';
import {
  isExclusionViolation,
  isUniqueViolation,
} from '../../common/errors/database-errors.js';
import { ApiException } from '../../common/errors/api-exception.js';
import { calculateTotalPrice } from '../../common/pricing/stay-pricing.js';
import { checkInInPastDetails } from '../../common/validation/stay-rules.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RoomAvailabilityService } from '../rooms/room-availability.service.js';
import { generateBookingCode } from './booking-code.js';
import { bookingErrors } from './booking-errors.js';
import { toBookingDto } from './bookings.mapper.js';
import { BookingDto } from './dto/booking.dto.js';
import { CancelBookingDto } from './dto/cancel-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

const OVERLAP_CONSTRAINT = 'bookings_no_overlap';
const BOOKING_CODE_CONSTRAINT = 'bookings_booking_code_key';
const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: RoomAvailabilityService,
  ) {}

  async create(dto: CreateBookingDto): Promise<BookingDto> {
    const pastDetails = checkInInPastDetails(dto.checkIn);
    if (pastDetails.length > 0) {
      throw ApiException.validation(pastDetails);
    }

    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction((tx) =>
          this.createInTransaction(tx, dto),
        );
      } catch (error) {
        // Ostateczną ochroną przed podwójną rezerwacją jest constraint w bazie (reguła BR-2). Sprawdzenie w transakcji
        // tylko wcześniej daje czytelny błąd, ale dwa równoległe żądania mogą oba je przejść. (DamianTchorzewski_72206)
        if (isExclusionViolation(error, OVERLAP_CONSTRAINT)) {
          throw bookingErrors.roomNotAvailable();
        }
        // Kolizja losowego kodu jest bardzo mało prawdopodobna, więc wystarczy wylosować nowy kod i ponowić zapis. (DamianTchorzewski_72206)
        if (!isUniqueViolation(error, BOOKING_CODE_CONSTRAINT)) {
          throw error;
        }
      }
    }

    throw new Error('Could not generate a unique booking code.');
  }

  // Szkielet kontraktu: anulacja zostanie dodana w kolejnym kroku zadania HOTEL-5. (DamianTchorzewski_72206)
  cancel(_dto: CancelBookingDto): Promise<BookingDto> {
    return Promise.reject(ApiException.notImplemented());
  }

  private async createInTransaction(
    tx: Prisma.TransactionClient,
    dto: CreateBookingDto,
  ): Promise<BookingDto> {
    const room = await tx.room.findFirst({
      where: { id: dto.roomId, isActive: true },
    });
    if (!room) {
      throw bookingErrors.roomNotFound();
    }
    if (dto.guestsCount > room.capacity) {
      throw bookingErrors.guestsExceedCapacity(room.capacity);
    }

    const pkg = dto.packageId
      ? await tx.package.findFirst({
          where: { id: dto.packageId, isActive: true },
        })
      : null;
    if (dto.packageId && !pkg) {
      throw bookingErrors.packageNotFound();
    }

    const occupied = await this.availability.findOccupiedRoomIds(
      [room.id],
      dto.checkIn,
      dto.checkOut,
      tx,
    );
    if (occupied.has(room.id)) {
      throw bookingErrors.roomNotAvailable();
    }

    // Cenę zawsze liczy serwer na podstawie aktualnych cen z bazy (reguła BR-3). (DamianTchorzewski_72206)
    const nights = nightsBetween(dto.checkIn, dto.checkOut);
    const booking = await tx.booking.create({
      data: {
        bookingCode: generateBookingCode(todayInHotel().slice(0, 4)),
        roomId: room.id,
        packageId: pkg?.id ?? null,
        checkIn: parseDateOnly(dto.checkIn),
        checkOut: parseDateOnly(dto.checkOut),
        guestsCount: dto.guestsCount,
        nightsCount: nights,
        totalPrice: calculateTotalPrice(room.pricePerNight, nights, pkg),
        guestFirstName: dto.guestDetails.firstName,
        guestLastName: dto.guestDetails.lastName,
        guestEmail: dto.guestDetails.email,
        guestPhone: dto.guestDetails.phone,
        voucherCode: dto.voucherCode ?? null,
      },
      include: { room: true, package: true },
    });

    return toBookingDto(booking);
  }
}
