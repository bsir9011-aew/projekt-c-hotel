import { Injectable } from '@nestjs/common';
import {
  formatDateOnly,
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
import {
  BookingStatus as DbBookingStatus,
  type Prisma,
} from '../../generated/prisma/client.js';
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

  async cancel(dto: CancelBookingDto): Promise<BookingDto> {
    // Rezerwację znajdujemy po unikalnym kodzie, a e-mail porównujemy w aplikacji bez rozróżniania wielkości liter.
    // Zapytanie z mode: 'insensitive' używa ILIKE, w którym znak "_" (częsty w adresach e-mail) bywa symbolem wieloznacznym. (DamianTchorzewski_72206)
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: dto.bookingCode },
      include: { room: true, package: true },
    });

    // Zły kod i zły e-mail dają identyczną odpowiedź, aby nie dało się sprawdzać, czy dany kod istnieje. (DamianTchorzewski_72206)
    if (
      !booking ||
      booking.guestEmail.toLowerCase() !== dto.email.toLowerCase()
    ) {
      throw bookingErrors.bookingNotFound();
    }
    if (booking.status === DbBookingStatus.CANCELLED) {
      throw bookingErrors.bookingAlreadyCancelled();
    }
    // Anulacja jest możliwa do dnia poprzedzającego przyjazd, a zakończone pobyty nie podlegają anulacji. (DamianTchorzewski_72206)
    if (
      booking.status !== DbBookingStatus.CONFIRMED ||
      formatDateOnly(booking.checkIn) <= todayInHotel()
    ) {
      throw bookingErrors.cancellationNotAllowed();
    }

    // Warunek na status w samym UPDATE sprawia, że przy dwóch równoległych anulacjach tylko jedna zadziała. (DamianTchorzewski_72206)
    const { count } = await this.prisma.booking.updateMany({
      where: { id: booking.id, status: DbBookingStatus.CONFIRMED },
      data: {
        status: DbBookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.reason || null,
      },
    });
    if (count === 0) {
      throw bookingErrors.bookingAlreadyCancelled();
    }

    const cancelled = await this.prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { room: true, package: true },
    });

    return toBookingDto(cancelled);
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
