import { todayInHotel } from '../dates/date-utils.js';
import type { ErrorDetailDto } from '../errors/error-response.dto.js';

// Reguła z kontraktu: data przyjazdu nie może być z przeszłości. Zależy od zegara, więc nie da się jej zapisać w DTO. (DamianTchorzewski_72206)
export function checkInInPastDetails(
  checkIn: string | undefined,
): ErrorDetailDto[] {
  if (checkIn !== undefined && checkIn < todayInHotel()) {
    return [{ field: 'checkIn', message: 'checkIn must not be in the past' }];
  }

  return [];
}
