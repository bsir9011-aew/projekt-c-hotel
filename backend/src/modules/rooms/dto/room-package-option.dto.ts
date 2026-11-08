import { ApiProperty } from '@nestjs/swagger';
import { PackageDto } from '../../packages/dto/package.dto.js';

// Pakiet możliwy do dokupienia razem z pokojem, wraz z ceną dla wybranego terminu. (DamianTchorzewski_72206)
export class RoomPackageOptionDto extends PackageDto {
  @ApiProperty({
    description:
      'Surcharge for the whole requested stay in PLN. Null when no dates were given',
    type: Number,
    nullable: true,
    example: 250,
  })
  priceForStay: number | null;
}
