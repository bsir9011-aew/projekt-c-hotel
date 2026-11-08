import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-exception.js';
import { BookingDto } from './dto/booking.dto.js';
import { CancelBookingDto } from './dto/cancel-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

@Injectable()
export class BookingsService {
  // Szkielet kontraktu: tworzenie rezerwacji zostanie dodane w zadaniu HOTEL-5. (DamianTchorzewski_72206)
  create(_dto: CreateBookingDto): Promise<BookingDto> {
    return Promise.reject(ApiException.notImplemented());
  }

  // Szkielet kontraktu: anulowanie rezerwacji zostanie dodane w zadaniu HOTEL-5. (DamianTchorzewski_72206)
  cancel(_dto: CancelBookingDto): Promise<BookingDto> {
    return Promise.reject(ApiException.notImplemented());
  }
}
