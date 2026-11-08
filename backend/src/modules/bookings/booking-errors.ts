import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error-code.enum.js';
import { ApiException } from '../../common/errors/api-exception.js';

// Błędy domenowe rezerwacji w jednym miejscu, aby tworzenie i anulacja zwracały identyczne odpowiedzi. (DamianTchorzewski_72206)
export const bookingErrors = {
  roomNotFound: (): ApiException =>
    new ApiException(
      HttpStatus.NOT_FOUND,
      ApiErrorCode.ROOM_NOT_FOUND,
      'The room does not exist or is not offered.',
    ),

  packageNotFound: (): ApiException =>
    new ApiException(
      HttpStatus.NOT_FOUND,
      ApiErrorCode.PACKAGE_NOT_FOUND,
      'The package does not exist or is not offered.',
    ),

  guestsExceedCapacity: (capacity: number): ApiException =>
    new ApiException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      ApiErrorCode.GUESTS_EXCEED_CAPACITY,
      `The room accommodates at most ${capacity} guests.`,
    ),

  roomNotAvailable: (): ApiException =>
    new ApiException(
      HttpStatus.CONFLICT,
      ApiErrorCode.ROOM_NOT_AVAILABLE,
      'The room is not available for the selected dates.',
    ),

  // Ten sam komunikat dla złego kodu i złego e-maila, aby nie dało się sprawdzać, czy dany kod istnieje. (DamianTchorzewski_72206)
  bookingNotFound: (): ApiException =>
    new ApiException(
      HttpStatus.NOT_FOUND,
      ApiErrorCode.BOOKING_NOT_FOUND,
      'No booking matches the given data.',
    ),

  bookingAlreadyCancelled: (): ApiException =>
    new ApiException(
      HttpStatus.CONFLICT,
      ApiErrorCode.BOOKING_ALREADY_CANCELLED,
      'The booking has already been cancelled.',
    ),

  cancellationNotAllowed: (): ApiException =>
    new ApiException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      ApiErrorCode.CANCELLATION_NOT_ALLOWED,
      'The booking can no longer be cancelled because the stay has started.',
    ),
};
