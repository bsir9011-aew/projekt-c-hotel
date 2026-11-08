import { parseDateOnly } from '../../src/common/dates/date-utils.js';
import type {
  Booking,
  Package,
  Prisma,
  Room,
} from '../../src/generated/prisma/client.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';

let sequence = 0;

// Alfabet kodów rezerwacji z kontraktu, żeby wygenerowane kody przechodziły walidację endpointów. (DamianTchorzewski_72206)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function nextBookingCode(): string {
  sequence += 1;
  const base = CODE_ALPHABET.length;
  let rest = sequence;
  let suffix = '';

  for (let position = 0; position < 4; position += 1) {
    suffix = CODE_ALPHABET.charAt(rest % base) + suffix;
    rest = Math.floor(rest / base);
  }

  return `HTL-2030-${suffix}`;
}

export function createRoom(
  prisma: PrismaService,
  overrides: Partial<Prisma.RoomUncheckedCreateInput> = {},
): Promise<Room> {
  sequence += 1;

  return prisma.room.create({
    data: {
      roomNumber: `T${sequence}`,
      name: `Test room ${sequence}`,
      description: 'Test description of the room.',
      pricePerNight: 100,
      capacity: 2,
      imageUrl: 'https://example.com/room.jpg',
      amenities: ['WiFi'],
      isActive: true,
      ...overrides,
    },
  });
}

export function createPackage(
  prisma: PrismaService,
  overrides: Partial<Prisma.PackageUncheckedCreateInput> = {},
): Promise<Package> {
  sequence += 1;

  return prisma.package.create({
    data: {
      name: `Test package ${sequence}`,
      description: 'Test description of the package.',
      priceModifier: 100,
      billingType: 'ONCE',
      includedServices: ['SPA_ACCESS'],
      isActive: true,
      ...overrides,
    },
  });
}

interface StayDates {
  checkIn: string;
  checkOut: string;
}

// Wstawia rezerwację bezpośrednio do bazy, z pominięciem API, aby przygotować stan do testu. (DamianTchorzewski_72206)
export function createBooking(
  prisma: PrismaService,
  roomId: string,
  stay: StayDates,
  overrides: Partial<Prisma.BookingUncheckedCreateInput> = {},
): Promise<Booking> {
  const nights =
    (parseDateOnly(stay.checkOut).getTime() -
      parseDateOnly(stay.checkIn).getTime()) /
    86_400_000;

  return prisma.booking.create({
    data: {
      bookingCode: nextBookingCode(),
      roomId,
      checkIn: parseDateOnly(stay.checkIn),
      checkOut: parseDateOnly(stay.checkOut),
      guestsCount: 2,
      nightsCount: nights,
      totalPrice: 100 * nights,
      status: 'CONFIRMED',
      guestFirstName: 'Jan',
      guestLastName: 'Kowalski',
      guestEmail: 'jan.kowalski@example.com',
      guestPhone: '+48123456789',
      ...overrides,
    },
  });
}
