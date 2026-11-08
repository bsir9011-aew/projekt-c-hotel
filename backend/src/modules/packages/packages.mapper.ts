import type {
  Package,
  PackageBillingType as DbPackageBillingType,
} from '../../generated/prisma/client.js';
import { toMoney } from '../../common/pricing/stay-pricing.js';
import type { Plain } from '../../common/types/plain.js';
import { PackageDto } from './dto/package.dto.js';
import { PackageBillingType } from './enums/package-billing-type.enum.js';

// Mapowanie zamiast rzutowania: kompilator wymusi obsługę każdej nowej wartości enuma z bazy. (DamianTchorzewski_72206)
const BILLING_TYPES: Record<DbPackageBillingType, PackageBillingType> = {
  ONCE: PackageBillingType.ONCE,
  PER_NIGHT: PackageBillingType.PER_NIGHT,
};

export function toPackageDto(pkg: Package): Plain<PackageDto> {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    priceModifier: toMoney(pkg.priceModifier),
    billingType: BILLING_TYPES[pkg.billingType],
    includedServices: pkg.includedServices,
  };
}
