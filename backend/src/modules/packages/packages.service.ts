import { Injectable } from '@nestjs/common';
import type { Package } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PackageListResponseDto } from './dto/package-list-response.dto.js';
import { toPackageDto } from './packages.mapper.js';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  // Aktywne pakiety w stałej kolejności. Korzysta z nich także moduł pokoi. (DamianTchorzewski_72206)
  findActive(): Promise<Package[]> {
    return this.prisma.package.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAll(): Promise<PackageListResponseDto> {
    const packages = await this.findActive();

    return { data: packages.map(toPackageDto) };
  }
}
