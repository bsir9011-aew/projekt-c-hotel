// Strefa czasowa hotelu: "dzisiaj" i daty pobytów zawsze liczymy według niej, a nie według serwera. (DamianTchorzewski_72206)
export const HOTEL_TIME_ZONE = 'Europe/Warsaw';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Locale en-CA formatuje datę jako RRRR-MM-DD. (DamianTchorzewski_72206)
const hotelDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: HOTEL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Dzisiejsza data w strefie hotelu, np. o 00:30 w Polsce jest już nowy dzień, choć w UTC jeszcze stary. (DamianTchorzewski_72206)
export function todayInHotel(now: Date = new Date()): string {
  return hotelDateFormat.format(now);
}

// Daty bez godziny trzymamy w UTC o północy, aby nie przesuwały się przy zmianie czasu. (DamianTchorzewski_72206)
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const difference =
    parseDateOnly(checkOut).getTime() - parseDateOnly(checkIn).getTime();

  return Math.round(difference / DAY_IN_MS);
}

export function addDays(value: string, days: number): string {
  return formatDateOnly(
    new Date(parseDateOnly(value).getTime() + days * DAY_IN_MS),
  );
}
