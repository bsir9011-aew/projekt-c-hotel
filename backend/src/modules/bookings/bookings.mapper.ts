import { formatDateOnly } from '../../common/dates/date-utils.js';
import { toMoney } from '../../common/pricing/stay-pricing.js';
import type { Plain } from '../../common/types/plain.js';
import type {
  BookingStatus as DbBookingStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { BookingDto } from './dto/booking.dto.js';
import { BookingStatus } from './enums/booking-status.enum.js';

// Rezerwacja razem z pokojem i pakietem, czyli wszystko, czego potrzebuje odpowiedź API. (DamianTchorzewski_72206)
export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: { room: true; package: true };
}>;

// Mapowanie zamiast rzutowania: kompilator wymusi obsługę każdej nowej wartości enuma z bazy. (DamianTchorzewski_72206)
const STATUSES: Record<DbBookingStatus, BookingStatus> = {
  CONFIRMED: BookingStatus.CONFIRMED,
  CANCELLED: BookingStatus.CANCELLED,
  COMPLETED: BookingStatus.COMPLETED,
};

export function toBookingStatus(status: DbBookingStatus): BookingStatus {
  return STATUSES[status];
}

export function toBookingDto(booking: BookingWithRelations): Plain<BookingDto> {
  return {
    id: booking.id,
    bookingCode: booking.bookingCode,
    status: toBookingStatus(booking.status),
    room: {
      id: booking.room.id,
      name: booking.room.name,
      roomNumber: booking.room.roomNumber,
    },
    package: booking.package
      ? { id: booking.package.id, name: booking.package.name }
      : null,
    checkIn: formatDateOnly(booking.checkIn),
    checkOut: formatDateOnly(booking.checkOut),
    nightsCount: booking.nightsCount,
    guestsCount: booking.guestsCount,
    totalPrice: toMoney(booking.totalPrice),
    guestDetails: {
      firstName: booking.guestFirstName,
      lastName: booking.guestLastName,
      email: booking.guestEmail,
      phone: booking.guestPhone,
    },
    voucherCode: booking.voucherCode,
    createdAt: booking.createdAt.toISOString(),
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    cancelReason: booking.cancelReason,
  };
}
