import { BOOKING_CODE_PATTERN } from '../../common/constants/booking.constants.js';
import { BOOKING_CODE_ALPHABET, generateBookingCode } from './booking-code.js';

describe('generateBookingCode', () => {
  it('builds a code from the year and four characters of the alphabet', () => {
    // Losowanie podstawione na sekwencję 0, 1, 2, 3, aby wynik był przewidywalny. (DamianTchorzewski_72206)
    let next = 0;
    const code = generateBookingCode('2026', () => next++);

    expect(code).toBe('HTL-2026-ABCD');
  });

  it('draws every character from the full alphabet range', () => {
    const draws: number[] = [];

    generateBookingCode('2026', (max) => {
      draws.push(max);
      return 0;
    });

    expect(draws).toEqual(Array(4).fill(BOOKING_CODE_ALPHABET.length));
  });

  it('always matches the code format from the API contract', () => {
    for (let i = 0; i < 2000; i += 1) {
      expect(generateBookingCode('2026')).toMatch(BOOKING_CODE_PATTERN);
    }
  });

  it('never uses characters that are easy to confuse', () => {
    expect(BOOKING_CODE_ALPHABET).not.toMatch(/[ILO01]/);
    expect(new Set(BOOKING_CODE_ALPHABET).size).toBe(
      BOOKING_CODE_ALPHABET.length,
    );
  });

  it('produces different codes', () => {
    const codes = new Set(
      Array.from({ length: 200 }, () => generateBookingCode('2026')),
    );

    expect(codes.size).toBeGreaterThan(190);
  });
});
