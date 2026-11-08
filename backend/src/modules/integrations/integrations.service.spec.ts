import type { Package } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { IntegrationsService } from './integrations.service.js';

const CODE = 'HTL-2026-X89B';

const spa = {
  id: 'pkg-1',
  name: 'Pakiet Relaks SPA',
  includedServices: ['MASSAGE_RELAX_60', 'SPA_ACCESS'],
} as unknown as Package;

function booking(overrides: Record<string, unknown> = {}) {
  return {
    bookingCode: CODE,
    status: 'CONFIRMED',
    checkIn: new Date('2026-11-15T00:00:00Z'),
    checkOut: new Date('2026-11-18T00:00:00Z'),
    guestsCount: 2,
    // Dane osobowe są w rekordzie, ale odpowiedź nie może ich zawierać. (DamianTchorzewski_72206)
    guestFirstName: 'Jan',
    guestLastName: 'Kowalski',
    guestEmail: 'jan.kowalski@example.com',
    guestPhone: '+48123456789',
    package: spa,
    ...overrides,
  };
}

describe('IntegrationsService.verifyBooking', () => {
  const findUnique = vi.fn();
  let service: IntegrationsService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T09:00:00Z'));

    findUnique.mockResolvedValue(booking());
    service = new IntegrationsService({
      booking: { findUnique },
    } as unknown as PrismaService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('looks the booking up by its code together with the package', async () => {
    await service.verifyBooking(CODE);

    expect(findUnique).toHaveBeenCalledWith({
      where: { bookingCode: CODE },
      include: { package: true },
    });
  });

  it('answers BOOKING_NOT_FOUND for an unknown code', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.verifyBooking(CODE)).rejects.toMatchObject({
      code: 'BOOKING_NOT_FOUND',
    });
  });

  it('uses today in the hotel time zone when no date is given', async () => {
    const result = await service.verifyBooking(CODE);

    expect(result).toMatchObject({ date: '2026-11-16', isActive: true });
  });

  it('reports the hotel date, not the server date, around midnight', async () => {
    // 23:30 UTC w listopadzie to już 00:30 następnego dnia w Polsce. (DamianTchorzewski_72206)
    vi.setSystemTime(new Date('2026-11-14T23:30:00Z'));

    const result = await service.verifyBooking(CODE);

    expect(result).toMatchObject({ date: '2026-11-15', isActive: true });
  });

  it.each([
    ['the day before the arrival', '2026-11-14', false],
    ['the arrival day', '2026-11-15', true],
    ['a day in the middle of the stay', '2026-11-16', true],
    ['the departure day', '2026-11-18', true],
    ['the day after the departure', '2026-11-19', false],
  ])('for %s (%s) isActive is %s', async (_label, date, expected) => {
    const result = await service.verifyBooking(CODE, date);

    expect(result.isActive).toBe(expected);
    expect(result.date).toBe(date);
  });

  it.each(['CANCELLED', 'COMPLETED'])(
    'is never active for a %s booking, even within its dates',
    async (status) => {
      findUnique.mockResolvedValue(booking({ status }));

      const result = await service.verifyBooking(CODE, '2026-11-16');

      expect(result).toMatchObject({ status, isActive: false });
    },
  );

  it('returns the package with the codes of the included services', async () => {
    const result = await service.verifyBooking(CODE);

    expect(result.package).toEqual({
      id: 'pkg-1',
      name: 'Pakiet Relaks SPA',
      includedServices: ['MASSAGE_RELAX_60', 'SPA_ACCESS'],
    });
  });

  it('returns a null package when none was bought', async () => {
    findUnique.mockResolvedValue(booking({ package: null }));

    const result = await service.verifyBooking(CODE);

    expect(result.package).toBeNull();
  });

  it('exposes no personal data of the guest', async () => {
    const result = await service.verifyBooking(CODE);

    expect(Object.keys(result).sort()).toEqual([
      'bookingCode',
      'checkIn',
      'checkOut',
      'date',
      'guestsCount',
      'isActive',
      'package',
      'status',
    ]);
    expect(JSON.stringify(result)).not.toMatch(/Kowalski|example\.com|\+48/);
  });
});
