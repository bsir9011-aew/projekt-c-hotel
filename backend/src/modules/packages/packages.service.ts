import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-exception.js';
import { PackageListResponseDto } from './dto/package-list-response.dto.js';

@Injectable()
export class PackagesService {
  // Szkielet kontraktu: logika zostanie dodana w zadaniu HOTEL-6. (DamianTchorzewski_72206)
  findAll(): Promise<PackageListResponseDto> {
    return Promise.reject(ApiException.notImplemented());
  }
}
