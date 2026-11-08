import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PackageListResponseDto } from './dto/package-list-response.dto.js';
import { PackagesService } from './packages.service.js';

@ApiTags('packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @ApiOperation({
    summary: 'List holiday packages',
    description:
      'Returns the active packages that can be added to a booking. Packages are not tied to a particular room.',
  })
  @ApiOkResponse({ type: PackageListResponseDto })
  findAll(): Promise<PackageListResponseDto> {
    return this.packagesService.findAll();
  }
}
