import { Prisma } from '../../generated/prisma/client.js';
import {
  calculatePackageCost,
  calculateRoomCost,
  calculateTotalPrice,
  type PackagePricing,
} from './stay-pricing.js';

const spa: PackagePricing = { billingType: 'ONCE', priceModifier: 250 };
const fitness: PackagePricing = { billingType: 'PER_NIGHT', priceModifier: 80 };

describe('calculateRoomCost', () => {
  it('multiplies the nightly price by the number of nights', () => {
    expect(calculateRoomCost(350, 3)).toBe(1050);
  });

  it('accepts database decimals and strings', () => {
    expect(calculateRoomCost(new Prisma.Decimal('320.00'), 2)).toBe(640);
    expect(calculateRoomCost('220', 4)).toBe(880);
  });

  it('does not accumulate floating point errors', () => {
    // Zwykłe liczby dałyby tu 1049.9699999999998. (DamianTchorzewski_72206)
    expect(calculateRoomCost('349.99', 3)).toBe(1049.97);
    expect(calculateRoomCost('0.10', 3)).toBe(0.3);
  });
});

describe('calculatePackageCost', () => {
  it('charges a ONCE package a single time regardless of the nights', () => {
    expect(calculatePackageCost(spa, 1)).toBe(250);
    expect(calculatePackageCost(spa, 7)).toBe(250);
  });

  it('charges a PER_NIGHT package for every night', () => {
    expect(calculatePackageCost(fitness, 3)).toBe(240);
    expect(calculatePackageCost(fitness, 1)).toBe(80);
  });
});

describe('calculateTotalPrice', () => {
  it('returns only the room cost without a package', () => {
    expect(calculateTotalPrice(350, 3, null)).toBe(1050);
  });

  it('adds a one-off package surcharge', () => {
    expect(calculateTotalPrice(350, 3, spa)).toBe(1300);
  });

  it('adds a per-night package surcharge', () => {
    expect(calculateTotalPrice(350, 3, fitness)).toBe(1290);
  });

  it('rounds the result to two decimal places', () => {
    const odd: PackagePricing = {
      billingType: 'PER_NIGHT',
      priceModifier: '33.333',
    };

    expect(calculateTotalPrice('100.10', 3, odd)).toBe(400.3);
  });
});
