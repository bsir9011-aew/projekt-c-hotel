import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-exception.js';
import { BookingVerificationDto } from './dto/booking-verification.dto.js';

@Injectable()
export class IntegrationsService {
  // Szkielet kontraktu: weryfikacja pobytu zostanie dodana w zadaniu HOTEL-5. (DamianTchorzewski_72206)
  verifyBooking(
    _bookingCode: string,
    _date?: string,
  ): Promise<BookingVerificationDto> {
    return Promise.reject(ApiException.notImplemented());
  }
}
