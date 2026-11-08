import { Prisma } from '../../generated/prisma/client.js';
import type { Package, Room } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { PackagesService } from '../packages/packages.service.js';
import type { RoomAvailabilityService } from './room-availability.service.js';
import { RoomsService } from './rooms.service.js';

function room(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    roomNumber: '101',
    name: 'Pokój Standard',
    description: 'Wygodny pokój z widokiem na ogród.',
    pricePerNight: new Prisma.Decimal(350),
    capacity: 2,
    imageUrl: 'https://example.com/101.jpg',
    amenities: ['WiFi'],
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function pkg(overrides: Partial<Package> = {}): Package {
  return {
    id: 'pkg-1',
    name: 'Pakiet Relaks SPA',
    description: 'Masaż i SPA.',
    priceModifier: new Prisma.Decimal(250),
    billingType: 'ONCE',
    includedServices: ['SPA_ACCESS'],
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('RoomsService', () => {
  const prisma = { room: { findMany: vi.fn(), findFirst: vi.fn() } };
  const availability = { findOccupiedRoomIds: vi.fn() };
  const packages = { findActive: vi.fn() };
  let service: RoomsService;

  beforeEach(() => {
    vi.resetAllMocks();
    // Ustalony "dzisiejszy" dzień, aby reguła o przeszłości była deterministyczna. (DamianTchorzewski_72206)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T12:00:00Z'));

    service = new RoomsService(
      prisma as unknown as PrismaService,
      availability as unknown as RoomAvailabilityService,
      packages as unknown as PackagesService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('search', () => {
    it('rejects a check-in in the past without querying the database', async () => {
      await expect(
        service.search({ checkIn: '2026-11-07', checkOut: '2026-11-09' }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: [{ field: 'checkIn' }],
      });
      expect(prisma.room.findMany).not.toHaveBeenCalled();
    });

    it('accepts a check-in today', async () => {
      prisma.room.findMany.mockResolvedValue([]);
      availability.findOccupiedRoomIds.mockResolvedValue(new Set());

      await expect(
        service.search({ checkIn: '2026-11-08', checkOut: '2026-11-09' }),
      ).resolves.toMatchObject({ meta: { nightsCount: 1 } });
    });

    it('rejects minPrice greater than maxPrice', async () => {
      await expect(
        service.search({ minPrice: 500, maxPrice: 300 }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: [{ field: 'maxPrice' }],
      });
    });

    it('reports every violated rule at once', async () => {
      await expect(
        service.search({
          checkIn: '2026-11-01',
          checkOut: '2026-11-03',
          minPrice: 500,
          maxPrice: 300,
        }),
      ).rejects.toMatchObject({
        details: [{ field: 'checkIn' }, { field: 'maxPrice' }],
      });
    });

    it('queries active rooms with the capacity and price filters', async () => {
      prisma.room.findMany.mockResolvedValue([]);

      await service.search({ guests: 3, minPrice: 200, maxPrice: 600 });

      expect(prisma.room.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          capacity: { gte: 3 },
          pricePerNight: { gte: 200, lte: 600 },
        },
        orderBy: [{ pricePerNight: 'asc' }, { roomNumber: 'asc' }],
      });
    });

    it('returns null stay fields and skips availability without dates', async () => {
      prisma.room.findMany.mockResolvedValue([room()]);

      const result = await service.search({ guests: 2 });

      expect(availability.findOccupiedRoomIds).not.toHaveBeenCalled();
      expect(result.meta).toEqual({
        checkIn: null,
        checkOut: null,
        nightsCount: null,
        guests: 2,
        totalResults: 1,
      });
      expect(result.data[0]).toMatchObject({
        id: 'room-1',
        pricePerNight: 350,
        totalStayPrice: null,
        status: null,
        isAvailable: null,
      });
    });

    it('hides occupied rooms by default when dates are given', async () => {
      prisma.room.findMany.mockResolvedValue([
        room({ id: 'free' }),
        room({ id: 'busy' }),
      ]);
      availability.findOccupiedRoomIds.mockResolvedValue(new Set(['busy']));

      const result = await service.search({
        checkIn: '2026-12-01',
        checkOut: '2026-12-04',
      });

      expect(availability.findOccupiedRoomIds).toHaveBeenCalledWith(
        ['free', 'busy'],
        '2026-12-01',
        '2026-12-04',
      );
      expect(result.data.map((item) => item.id)).toEqual(['free']);
      expect(result.data[0]).toMatchObject({
        status: 'AVAILABLE',
        isAvailable: true,
        totalStayPrice: 1050,
      });
      expect(result.meta).toMatchObject({
        nightsCount: 3,
        totalResults: 1,
      });
    });

    it('lists occupied rooms with the OCCUPIED status when onlyAvailable is false', async () => {
      prisma.room.findMany.mockResolvedValue([
        room({ id: 'free' }),
        room({ id: 'busy' }),
      ]);
      availability.findOccupiedRoomIds.mockResolvedValue(new Set(['busy']));

      const result = await service.search({
        checkIn: '2026-12-01',
        checkOut: '2026-12-04',
        onlyAvailable: false,
      });

      expect(result.data.map((item) => [item.id, item.status])).toEqual([
        ['free', 'AVAILABLE'],
        ['busy', 'OCCUPIED'],
      ]);
      expect(result.data[1]?.isAvailable).toBe(false);
    });

    it('ignores onlyAvailable when no dates are given', async () => {
      prisma.room.findMany.mockResolvedValue([room()]);

      const result = await service.search({ onlyAvailable: true });

      expect(result.data).toHaveLength(1);
    });

    it('derives the short description from the full one', async () => {
      prisma.room.findMany.mockResolvedValue([
        room({ description: 'a'.repeat(300) }),
      ]);

      const result = await service.search({});

      expect(result.data[0]?.shortDescription).toHaveLength(160);
    });
  });

  describe('findOne', () => {
    it('rejects a check-in in the past', async () => {
      await expect(
        service.findOne('room-1', {
          checkIn: '2026-11-01',
          checkOut: '2026-11-03',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('throws ROOM_NOT_FOUND for a missing or inactive room', async () => {
      prisma.room.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing', {})).rejects.toMatchObject({
        code: 'ROOM_NOT_FOUND',
      });
      expect(prisma.room.findFirst).toHaveBeenCalledWith({
        where: { id: 'missing', isActive: true },
      });
    });

    it('returns null stay fields and package prices without dates', async () => {
      prisma.room.findFirst.mockResolvedValue(room());
      packages.findActive.mockResolvedValue([pkg()]);

      const result = await service.findOne('room-1', {});

      expect(result).toMatchObject({
        description: 'Wygodny pokój z widokiem na ogród.',
        nightsCount: null,
        totalStayPrice: null,
        status: null,
        isAvailable: null,
      });
      expect(result.availablePackages[0]).toMatchObject({
        priceModifier: 250,
        priceForStay: null,
      });
    });

    it('prices the stay and every package for the given dates', async () => {
      prisma.room.findFirst.mockResolvedValue(room());
      packages.findActive.mockResolvedValue([
        pkg({ id: 'once' }),
        pkg({
          id: 'nightly',
          billingType: 'PER_NIGHT',
          priceModifier: new Prisma.Decimal(80),
        }),
      ]);
      availability.findOccupiedRoomIds.mockResolvedValue(new Set());

      const result = await service.findOne('room-1', {
        checkIn: '2026-12-01',
        checkOut: '2026-12-04',
      });

      expect(result).toMatchObject({
        nightsCount: 3,
        totalStayPrice: 1050,
        status: 'AVAILABLE',
        isAvailable: true,
      });
      expect(
        result.availablePackages.map((item) => [item.id, item.priceForStay]),
      ).toEqual([
        ['once', 250],
        ['nightly', 240],
      ]);
    });

    it('still returns an occupied room, marked as OCCUPIED', async () => {
      prisma.room.findFirst.mockResolvedValue(room());
      packages.findActive.mockResolvedValue([]);
      availability.findOccupiedRoomIds.mockResolvedValue(new Set(['room-1']));

      const result = await service.findOne('room-1', {
        checkIn: '2026-12-01',
        checkOut: '2026-12-04',
      });

      expect(result).toMatchObject({ status: 'OCCUPIED', isAvailable: false });
    });
  });
});
