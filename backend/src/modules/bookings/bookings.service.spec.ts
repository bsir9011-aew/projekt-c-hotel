import { Prisma } from '../../generated/prisma/client.js';
import type { Package, Room } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { RoomAvailabilityService } from '../rooms/room-availability.service.js';
import { BOOKING_CODE_PATTERN } from '../../common/constants/booking.constants.js';
import type { Plain } from '../../common/types/plain.js';
import { BookingsService } from './bookings.service.js';
import type { BookingWithRelations } from './bookings.mapper.js';
import type { CreateBookingDto } from './dto/create-booking.dto.js';

const room: Room = {
  id: 'room-1',
  roomNumber: '101',
  name: 'Pokój Standard',
  description: 'Opis',
  pricePerNight: new Prisma.Decimal(350),
  capacity: 2,
  imageUrl: 'https://example.com/101.jpg',
  amenities: [],
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const spa: Package = {
  id: 'pkg-1',
  name: 'Pakiet Relaks SPA',
  description: 'Masaż i SPA.',
  priceModifier: new Prisma.Decimal(250),
  billingType: 'ONCE',
  includedServices: ['SPA_ACCESS'],
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

// Zwykły obiekt zamiast instancji klasy DTO, dzięki czemu testy mogą go bezpiecznie rozwijać operatorem spread. (DamianTchorzewski_72206)
const dto: Plain<CreateBookingDto> = {
  roomId: 'room-1',
  packageId: null,
  checkIn: '2026-12-01',
  checkOut: '2026-12-04',
  guestsCount: 2,
  guestDetails: {
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 'jan.kowalski@example.com',
    phone: '+48123456789',
  },
};

// Odtwarza rekord zwracany przez bazę: cena wraca jako Decimal, a rezerwacja ma dołączony pokój i pakiet. (DamianTchorzewski_72206)
function savedBooking(
  data: Record<string, unknown>,
  pkg: Package | null,
): BookingWithRelations {
  return {
    id: 'booking-1',
    status: 'CONFIRMED',
    cancelReason: null,
    cancelledAt: null,
    createdAt: new Date('2026-11-08T15:30:00Z'),
    voucherCode: null,
    ...data,
    totalPrice: new Prisma.Decimal(data['totalPrice'] as number),
    room,
    package: pkg,
  } as unknown as BookingWithRelations;
}

// Argumenty, z którymi serwis zapisał rezerwację. Pierwsze wywołanie musi istnieć, inaczej test zawodzi. (DamianTchorzewski_72206)
function firstSavedData(
  create: ReturnType<typeof vi.fn>,
): Record<string, unknown> {
  const [call] = create.mock.calls;
  if (!call) {
    throw new Error('The booking was not saved.');
  }

  return (call[0] as { data: Record<string, unknown> }).data;
}

function overlapError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('overlap', {
    code: 'P2039',
    clientVersion: 'test',
    meta: {
      code: '23P01',
      message:
        'conflicting key value violates exclusion constraint "bookings_no_overlap"',
    },
  });
}

function duplicateCodeError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { index: 'bookings_booking_code_key' },
  });
}

describe('BookingsService.create', () => {
  const tx = {
    room: { findFirst: vi.fn() },
    package: { findFirst: vi.fn() },
    booking: { create: vi.fn() },
  };
  const prisma = { $transaction: vi.fn() };
  const availability = { findOccupiedRoomIds: vi.fn() };
  let service: BookingsService;

  beforeEach(() => {
    vi.resetAllMocks();
    // Ustalony "dzisiejszy" dzień, aby reguła o przeszłości była deterministyczna. (DamianTchorzewski_72206)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T12:00:00Z'));

    prisma.$transaction.mockImplementation(
      (work: (client: typeof tx) => unknown) => work(tx),
    );
    tx.room.findFirst.mockResolvedValue(room);
    tx.package.findFirst.mockResolvedValue(null);
    availability.findOccupiedRoomIds.mockResolvedValue(new Set());
    tx.booking.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(savedBooking(data, null)),
    );

    service = new BookingsService(
      prisma as unknown as PrismaService,
      availability as unknown as RoomAvailabilityService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects a check-in in the past without opening a transaction', async () => {
    await expect(
      service.create({ ...dto, checkIn: '2026-11-07', checkOut: '2026-11-09' }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'checkIn' }],
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws ROOM_NOT_FOUND for a missing or inactive room', async () => {
    tx.room.findFirst.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toMatchObject({
      code: 'ROOM_NOT_FOUND',
    });
    expect(tx.room.findFirst).toHaveBeenCalledWith({
      where: { id: 'room-1', isActive: true },
    });
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('throws GUESTS_EXCEED_CAPACITY when the room is too small', async () => {
    await expect(
      service.create({ ...dto, guestsCount: 3 }),
    ).rejects.toMatchObject({
      code: 'GUESTS_EXCEED_CAPACITY',
      message: 'The room accommodates at most 2 guests.',
    });
  });

  it('accepts exactly as many guests as the room holds', async () => {
    await expect(
      service.create({ ...dto, guestsCount: 2 }),
    ).resolves.toBeDefined();
  });

  it('throws PACKAGE_NOT_FOUND for a missing or inactive package', async () => {
    tx.package.findFirst.mockResolvedValue(null);

    await expect(
      service.create({ ...dto, packageId: 'missing' }),
    ).rejects.toMatchObject({ code: 'PACKAGE_NOT_FOUND' });
    expect(tx.package.findFirst).toHaveBeenCalledWith({
      where: { id: 'missing', isActive: true },
    });
  });

  it('does not look for a package when none was chosen', async () => {
    await service.create(dto);

    expect(tx.package.findFirst).not.toHaveBeenCalled();
  });

  it('throws ROOM_NOT_AVAILABLE when the dates are occupied, checking inside the transaction', async () => {
    availability.findOccupiedRoomIds.mockResolvedValue(new Set(['room-1']));

    await expect(service.create(dto)).rejects.toMatchObject({
      code: 'ROOM_NOT_AVAILABLE',
    });
    expect(availability.findOccupiedRoomIds).toHaveBeenCalledWith(
      ['room-1'],
      '2026-12-01',
      '2026-12-04',
      tx,
    );
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('saves a confirmed booking with a server calculated price', async () => {
    tx.package.findFirst.mockResolvedValue(spa);
    tx.booking.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(savedBooking(data, spa)),
    );

    const result = await service.create({
      ...dto,
      packageId: 'pkg-1',
      voucherCode: 'JESIEN2026',
    });

    const saved = firstSavedData(tx.booking.create);
    expect(saved).toMatchObject({
      roomId: 'room-1',
      packageId: 'pkg-1',
      guestsCount: 2,
      nightsCount: 3,
      guestFirstName: 'Jan',
      guestLastName: 'Kowalski',
      guestEmail: 'jan.kowalski@example.com',
      guestPhone: '+48123456789',
      voucherCode: 'JESIEN2026',
    });
    expect(String(saved['totalPrice'])).toBe('1300');
    expect(saved['bookingCode']).toMatch(BOOKING_CODE_PATTERN);
    expect(String(saved['bookingCode'])).toContain('-2026-');
    expect(result).toMatchObject({
      status: 'CONFIRMED',
      checkIn: '2026-12-01',
      checkOut: '2026-12-04',
      nightsCount: 3,
      totalPrice: 1300,
      voucherCode: 'JESIEN2026',
      package: { id: 'pkg-1', name: 'Pakiet Relaks SPA' },
    });
  });

  it('turns a database overlap violation into ROOM_NOT_AVAILABLE', async () => {
    // Dwa równoległe żądania mogą oba przejść sprawdzenie w transakcji, ale tylko jedno przejdzie constraint. (DamianTchorzewski_72206)
    tx.booking.create.mockRejectedValue(overlapError());

    await expect(service.create(dto)).rejects.toMatchObject({
      code: 'ROOM_NOT_AVAILABLE',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('retries with a new code when the generated code is already taken', async () => {
    tx.booking.create
      .mockRejectedValueOnce(duplicateCodeError())
      .mockRejectedValueOnce(duplicateCodeError())
      .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(savedBooking(data, null)),
      );

    await expect(service.create(dto)).resolves.toMatchObject({
      status: 'CONFIRMED',
    });
    expect(tx.booking.create).toHaveBeenCalledTimes(3);
  });

  it('gives up after five code collisions', async () => {
    tx.booking.create.mockRejectedValue(duplicateCodeError());

    await expect(service.create(dto)).rejects.toThrow(/unique booking code/);
    expect(tx.booking.create).toHaveBeenCalledTimes(5);
  });

  it('passes unexpected database errors through unchanged', async () => {
    const failure = new Error('connection lost');
    tx.booking.create.mockRejectedValue(failure);

    await expect(service.create(dto)).rejects.toBe(failure);
    expect(tx.booking.create).toHaveBeenCalledTimes(1);
  });
});
