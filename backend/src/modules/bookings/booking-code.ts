import { randomInt } from 'node:crypto';

// Alfabet bez łatwych do pomylenia znaków (I, L, O, 0, 1). Musi pasować do BOOKING_CODE_PATTERN z kontraktu. (DamianTchorzewski_72206)
export const BOOKING_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 4;

// Kod w formacie HTL-<rok>-<4 znaki>, np. HTL-2026-X89B. Znaki losuje kryptograficzny generator, więc kodów nie da się przewidzieć.
// Przestrzeń to 31^4 (ok. 920 tys.) kodów na rok. Kolizje obsługuje ponawianie zapisu w BookingsService. (DamianTchorzewski_72206)
export function generateBookingCode(
  year: string,
  random: (max: number) => number = randomInt,
): string {
  let suffix = '';

  for (let position = 0; position < SUFFIX_LENGTH; position += 1) {
    suffix += BOOKING_CODE_ALPHABET.charAt(
      random(BOOKING_CODE_ALPHABET.length),
    );
  }

  return `HTL-${year}-${suffix}`;
}
