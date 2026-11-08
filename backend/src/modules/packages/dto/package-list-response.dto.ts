import { ApiProperty } from '@nestjs/swagger';
import { PackageDto } from './package.dto.js';

export class PackageListResponseDto {
  @ApiProperty({ type: [PackageDto] })
  data: PackageDto[];
}
