import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { RoomAvailabilityService } from '../rooms/room-availability.service.js';
import { BookingsService } from './bookings.service.js';
import type { BookingWithRelations } from './bookings.mapper.js';

const CODE = 'HTL-2026-X89B';
const EMAIL = 'jan.kowalski@example.com';

// "Dzisiaj" w hotelu to 2026-11-08, więc anulacja jest możliwa tylko dla przyjazdów od 2026-11-09. (DamianTchorzewski_72206)
function booking(
  overrides: Record<string, unknown> = {},
): BookingWithRelations {
  return {
    id: 'booking-1',
    bookingCode: CODE,
    status: 'CONFIRMED',
    checkIn: new Date('2026-11-20T00:00:00Z'),
    checkOut: new Date('2026-11-23T00:00:00Z'),
    guestsCount: 2,
    nightsCount: 3,
    totalPrice: new Prisma.Decimal(1050),
    guestFirstName: 'Jan',
    guestLastName: 'Kowalski',
    guestEmail: EMAIL,
    guestPhone: '+48123456789',
    voucherCode: null,
    cancelReason: null,
    cancelledAt: null,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    room: { id: 'room-1', name: 'Pokój Standard', roomNumber: '101' },
    package: null,
    ...overrides,
  } as unknown as BookingWithRelations;
}

describe('BookingsService.cancel', () => {
  const prismaBooking = {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  };
  let service: BookingsService;

  const cancel = (
    overrides: { bookingCode?: string; email?: string; reason?: string } = {},
  ) => service.cancel({ bookingCode: CODE, email: EMAIL, ...overrides });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T12:00:00Z'));

    prismaBooking.findUnique.mockResolvedValue(booking());
    prismaBooking.updateMany.mockResolvedValue({ count: 1 });
    prismaBooking.findUniqueOrThrow.mockResolvedValue(
      booking({
        status: 'CANCELLED',
        cancelledAt: new Date('2026-11-08T12:00:00Z'),
        cancelReason: 'Zmiana planów',
      }),
    );

    service = new BookingsService(
      { booking: prismaBooking } as unknown as PrismaService,
      {} as unknown as RoomAvailabilityService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('looks the booking up by its unique code', async () => {
    await cancel();

    expect(prismaBooking.findUnique).toHaveBeenCalledWith({
      where: { bookingCode: CODE },
      include: { room: true, package: true },
    });
  });

  it('cancels a confirmed booking and returns it as cancelled', async () => {
    const result = await cancel({ reason: 'Zmiana planów' });

    expect(result).toMatchObject({
      bookingCode: CODE,
      status: 'CANCELLED',
      cancelledAt: '2026-11-08T12:00:00.000Z',
      cancelReason: 'Zmiana planów',
    });
  });

  it('updates only a booking that is still confirmed', async () => {
    await cancel({ reason: 'Zmiana planów' });

    expect(prismaBooking.updateMany).toHaveBeenCalledWith({
      where: { id: 'booking-1', status: 'CONFIRMED' },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date('2026-11-08T12:00:00Z'),
        cancelReason: 'Zmiana planów',
      },
    });
  });

  it('stores no reason as null', async () => {
    await cancel();
    await cancel({ reason: '' });

    for (const [call] of prismaBooking.updateMany.mock.calls) {
      expect(
        (call as { data: { cancelReason: unknown } }).data.cancelReason,
      ).toBeNull();
    }
  });

  it('accepts the e-mail in a different letter case', async () => {
    prismaBooking.findUnique.mockResolvedValue(
      booking({ guestEmail: 'Jan.Kowalski@Example.COM' }),
    );

    await expect(cancel()).resolves.toMatchObject({ status: 'CANCELLED' });
  });

  it('does not treat an underscore in the e-mail as a wildcard', async () => {
    prismaBooking.findUnique.mockResolvedValue(
      booking({ guestEmail: 'jan_kowalski@example.com' }),
    );

    await expect(
      cancel({ email: 'janXkowalski@example.com' }),
    ).rejects.toMatchObject({ code: 'BOOKING_NOT_FOUND' });
  });

  describe('rejections', () => {
    const expectNothingChanged = () => {
      expect(prismaBooking.updateMany).not.toHaveBeenCalled();
    };

    it('answers BOOKING_NOT_FOUND for an unknown code', async () => {
      prismaBooking.findUnique.mockResolvedValue(null);

      await expect(cancel()).rejects.toMatchObject({
        code: 'BOOKING_NOT_FOUND',
      });
      expectNothingChanged();
    });

    it('answers exactly the same for a wrong e-mail as for an unknown code', async () => {
      prismaBooking.findUnique.mockResolvedValue(null);
      const unknownCode = await cancel().catch((error: unknown) => error);
      prismaBooking.findUnique.mockResolvedValue(booking());
      const wrongEmail = await cancel({ email: 'other@example.com' }).catch(
        (error: unknown) => error,
      );

      expect(wrongEmail).toMatchObject({
        code: 'BOOKING_NOT_FOUND',
        message: (unknownCode as Error).message,
      });
      expect((wrongEmail as { getStatus(): number }).getStatus()).toBe(404);
      expectNothingChanged();
    });

    it('answers BOOKING_ALREADY_CANCELLED for a cancelled booking', async () => {
      prismaBooking.findUnique.mockResolvedValue(
        booking({ status: 'CANCELLED' }),
      );

      await expect(cancel()).rejects.toMatchObject({
        code: 'BOOKING_ALREADY_CANCELLED',
      });
      expectNothingChanged();
    });

    it('reports a cancelled booking as such even when its stay has started', async () => {
      prismaBooking.findUnique.mockResolvedValue(
        booking({
          status: 'CANCELLED',
          checkIn: new Date('2026-11-01T00:00:00Z'),
        }),
      );

      await expect(cancel()).rejects.toMatchObject({
        code: 'BOOKING_ALREADY_CANCELLED',
      });
    });

    it.each([
      ['arrival today', '2026-11-08'],
      ['arrival in the past', '2026-11-05'],
    ])('answers CANCELLATION_NOT_ALLOWED for %s', async (_label, checkIn) => {
      prismaBooking.findUnique.mockResolvedValue(
        booking({ checkIn: new Date(`${checkIn}T00:00:00Z`) }),
      );

      await expect(cancel()).rejects.toMatchObject({
        code: 'CANCELLATION_NOT_ALLOWED',
      });
      expectNothingChanged();
    });

    it('answers CANCELLATION_NOT_ALLOWED for a completed stay', async () => {
      prismaBooking.findUnique.mockResolvedValue(
        booking({ status: 'COMPLETED' }),
      );

      await expect(cancel()).rejects.toMatchObject({
        code: 'CANCELLATION_NOT_ALLOWED',
      });
    });

    it('still allows cancelling on the day before the arrival', async () => {
      prismaBooking.findUnique.mockResolvedValue(
        booking({ checkIn: new Date('2026-11-09T00:00:00Z') }),
      );

      await expect(cancel()).resolves.toMatchObject({ status: 'CANCELLED' });
    });

    it('answers BOOKING_ALREADY_CANCELLED when another request cancelled it first', async () => {
      // Między odczytem a zapisem rezerwację anulowało inne żądanie, więc UPDATE nie zmienił żadnego wiersza. (DamianTchorzewski_72206)
      prismaBooking.updateMany.mockResolvedValue({ count: 0 });

      await expect(cancel()).rejects.toMatchObject({
        code: 'BOOKING_ALREADY_CANCELLED',
      });
    });
  });
});
