import { Injectable } from '@nestjs/common';
import { formatDateOnly, todayInHotel } from '../../common/dates/date-utils.js';
import { BookingStatus as DbBookingStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { bookingErrors } from '../bookings/booking-errors.js';
import { toBookingStatus } from '../bookings/bookings.mapper.js';
import { BookingVerificationDto } from './dto/booking-verification.dto.js';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Pozwala zespołom masaży i fitnessu sprawdzić, czy gość z danym kodem ma w wybranym dniu pobyt i jakie usługi mu przysługują.
  // Odpowiedź nie zawiera danych osobowych, bo jedynym zabezpieczeniem poza kluczem API jest sam kod rezerwacji. (DamianTchorzewski_72206)
  async verifyBooking(
    bookingCode: string,
    date?: string,
  ): Promise<BookingVerificationDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode },
      include: { package: true },
    });
    if (!booking) {
      throw bookingErrors.bookingNotFound();
    }

    const day = date ?? todayInHotel();
    const checkIn = formatDateOnly(booking.checkIn);
    const checkOut = formatDateOnly(booking.checkOut);

    return {
      bookingCode: booking.bookingCode,
      status: toBookingStatus(booking.status),
      date: day,
      // Dzień wyjazdu nadal się liczy jako aktywny pobyt, np. na poranny masaż. Formaty RRRR-MM-DD można porównywać jako tekst. (DamianTchorzewski_72206)
      isActive:
        booking.status === DbBookingStatus.CONFIRMED &&
        checkIn <= day &&
        day <= checkOut,
      checkIn,
      checkOut,
      guestsCount: booking.guestsCount,
      package: booking.package
        ? {
            id: booking.package.id,
            name: booking.package.name,
            includedServices: booking.package.includedServices,
          }
        : null,
    };
  }
}
