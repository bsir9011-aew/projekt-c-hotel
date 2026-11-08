import { Prisma } from '../../generated/prisma/client.js';
import type { Package } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { PackagesService } from './packages.service.js';

function pkg(overrides: Partial<Package> = {}): Package {
  return {
    id: 'pkg-1',
    name: 'Pakiet Relaks SPA',
    description: 'Masaż i SPA.',
    priceModifier: new Prisma.Decimal('250.00'),
    billingType: 'ONCE',
    includedServices: ['MASSAGE_RELAX_60', 'SPA_ACCESS'],
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('PackagesService', () => {
  const findMany = vi.fn();
  let service: PackagesService;

  beforeEach(() => {
    findMany.mockReset();
    service = new PackagesService({
      package: { findMany },
    } as unknown as PrismaService);
  });

  it('asks only for active packages in a stable order', async () => {
    findMany.mockResolvedValue([]);

    await service.findAll();

    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  });

  it('maps database decimals to plain numbers', async () => {
    findMany.mockResolvedValue([
      pkg(),
      pkg({
        id: 'pkg-2',
        billingType: 'PER_NIGHT',
        priceModifier: new Prisma.Decimal('79.90'),
      }),
    ]);

    const result = await service.findAll();

    expect(result.data).toEqual([
      {
        id: 'pkg-1',
        name: 'Pakiet Relaks SPA',
        description: 'Masaż i SPA.',
        priceModifier: 250,
        billingType: 'ONCE',
        includedServices: ['MASSAGE_RELAX_60', 'SPA_ACCESS'],
      },
      expect.objectContaining({
        id: 'pkg-2',
        priceModifier: 79.9,
        billingType: 'PER_NIGHT',
      }),
    ]);
    expect(typeof result.data[0]?.priceModifier).toBe('number');
  });
});
