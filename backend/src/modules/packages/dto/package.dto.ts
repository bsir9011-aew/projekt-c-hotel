import { ApiProperty } from '@nestjs/swagger';
import { PackageBillingType } from '../enums/package-billing-type.enum.js';

export class PackageDto {
  @ApiProperty({
    format: 'uuid',
    example: '3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11',
  })
  id: string;

  @ApiProperty({ example: 'Pakiet Relaks SPA' })
  name: string;

  @ApiProperty({ example: 'Masaż relaksacyjny oraz dostęp do strefy SPA.' })
  description: string;

  @ApiProperty({
    description:
      'Surcharge in PLN with two decimal places. Charged once or for every night, depending on billingType',
    example: 250,
  })
  priceModifier: number;

  @ApiProperty({
    enum: PackageBillingType,
    enumName: 'PackageBillingType',
    example: PackageBillingType.ONCE,
  })
  billingType: PackageBillingType;

  @ApiProperty({
    description:
      'Stable codes of the services included in the package, agreed with the partner teams',
    type: [String],
    example: ['MASSAGE_RELAX_60', 'SPA_ACCESS'],
  })
  includedServices: string[];
}
