import {
  addDays,
  formatDateOnly,
  nightsBetween,
  parseDateOnly,
  todayInHotel,
} from './date-utils.js';

describe('todayInHotel', () => {
  it.each([
    ['2026-11-08T12:00:00Z', '2026-11-08'],
    // Zima: Polska to UTC+1, więc 23:00 UTC to już północ w hotelu. (DamianTchorzewski_72206)
    ['2026-11-08T22:59:59Z', '2026-11-08'],
    ['2026-11-08T23:00:00Z', '2026-11-09'],
    // Lato: Polska to UTC+2, więc granica dnia przesuwa się o godzinę. (DamianTchorzewski_72206)
    ['2026-07-01T21:59:59Z', '2026-07-01'],
    ['2026-07-01T22:00:00Z', '2026-07-02'],
  ])('maps %s to the hotel date %s', (instant, expected) => {
    expect(todayInHotel(new Date(instant))).toBe(expected);
  });

  it('uses the current time by default', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'));

    expect(todayInHotel()).toBe('2027-01-01');

    vi.useRealTimers();
  });
});

describe('nightsBetween', () => {
  it('counts nights between two dates', () => {
    expect(nightsBetween('2026-11-15', '2026-11-18')).toBe(3);
    expect(nightsBetween('2026-11-15', '2026-11-16')).toBe(1);
  });

  it('is not affected by the daylight saving time change', () => {
    // Zmiana czasu w Polsce wypada 29.03.2026, a doba nadal ma być liczona jako jedna noc. (DamianTchorzewski_72206)
    expect(nightsBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(nightsBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('counts across month and year boundaries', () => {
    expect(nightsBetween('2026-12-30', '2027-01-02')).toBe(3);
  });
});

describe('addDays', () => {
  it('adds and subtracts days across boundaries', () => {
    expect(addDays('2026-11-28', 5)).toBe('2026-12-03');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('parseDateOnly and formatDateOnly', () => {
  it('round-trips a date at UTC midnight', () => {
    const date = parseDateOnly('2026-11-15');

    expect(date.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(formatDateOnly(date)).toBe('2026-11-15');
  });
});
