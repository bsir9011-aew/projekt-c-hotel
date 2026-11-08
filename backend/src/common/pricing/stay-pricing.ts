import { Prisma } from '../../generated/prisma/client.js';

type MoneyInput = Prisma.Decimal | number | string;

export interface PackagePricing {
  billingType: 'ONCE' | 'PER_NIGHT';
  priceModifier: MoneyInput;
}

// Kwoty liczymy na liczbach dziesiętnych, bo zwykłe liczby zmiennoprzecinkowe dają błędy (np. 0.1 + 0.2). (DamianTchorzewski_72206)
export function toMoney(value: Prisma.Decimal): number {
  return value.toDecimalPlaces(2).toNumber();
}

function packageDecimal(
  pricing: PackagePricing,
  nights: number,
): Prisma.Decimal {
  const surcharge = new Prisma.Decimal(pricing.priceModifier);

  // Dopłata jednorazowa albo naliczana za każdą noc, zgodnie z regułą BR-3. (DamianTchorzewski_72206)
  return pricing.billingType === 'PER_NIGHT'
    ? surcharge.mul(nights)
    : surcharge;
}

// Koszt samego pokoju za cały pobyt. (DamianTchorzewski_72206)
export function calculateRoomCost(
  pricePerNight: MoneyInput,
  nights: number,
): number {
  return toMoney(new Prisma.Decimal(pricePerNight).mul(nights));
}

// Dopłata za pakiet dla całego pobytu. (DamianTchorzewski_72206)
export function calculatePackageCost(
  pricing: PackagePricing,
  nights: number,
): number {
  return toMoney(packageDecimal(pricing, nights));
}

// Całkowity koszt pobytu: pokój za wszystkie noce plus ewentualny pakiet. (DamianTchorzewski_72206)
export function calculateTotalPrice(
  pricePerNight: MoneyInput,
  nights: number,
  pricing: PackagePricing | null,
): number {
  const room = new Prisma.Decimal(pricePerNight).mul(nights);
  const total = pricing ? room.plus(packageDecimal(pricing, nights)) : room;

  return toMoney(total);
}
