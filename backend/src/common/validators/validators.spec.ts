import { validate } from 'class-validator';
import {
  IsCalendarDate,
  isCalendarDate,
} from './is-calendar-date.decorator.js';
import { IsDateAfter } from './is-date-after.decorator.js';

class StaySample {
  @IsCalendarDate()
  checkIn: unknown;

  @IsCalendarDate()
  @IsDateAfter('checkIn')
  checkOut: unknown;
}

function sample(checkIn: unknown, checkOut: unknown): StaySample {
  return Object.assign(new StaySample(), { checkIn, checkOut });
}

async function messages(instance: StaySample): Promise<string[]> {
  const errors = await validate(instance);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('isCalendarDate', () => {
  it.each(['2026-11-15', '2028-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(isCalendarDate(value)).toBe(true);
  });

  it.each([
    '2026-02-30',
    '2027-02-29',
    '2026-13-01',
    '2026-11-5',
    '15-11-2026',
    '2026-11-15T10:00:00Z',
    '',
  ])('rejects the text %j', (value) => {
    expect(isCalendarDate(value)).toBe(false);
  });

  it.each([null, undefined, 20261115, new Date()])(
    'rejects the non-text value %j',
    (value) => {
      expect(isCalendarDate(value)).toBe(false);
    },
  );
});

describe('IsCalendarDate and IsDateAfter decorators', () => {
  it('accepts a valid stay', async () => {
    expect(await messages(sample('2026-11-15', '2026-11-18'))).toEqual([]);
  });

  it('rejects a check-out equal to the check-in', async () => {
    expect(await messages(sample('2026-11-15', '2026-11-15'))).toEqual([
      'checkOut must be later than checkIn',
    ]);
  });

  it('rejects a check-out before the check-in', async () => {
    expect(await messages(sample('2026-11-15', '2026-11-10'))).toEqual([
      'checkOut must be later than checkIn',
    ]);
  });

  it('reports only the format error for an invalid check-out', async () => {
    expect(await messages(sample('2026-11-15', '2026-02-30'))).toEqual([
      'checkOut must be a valid calendar date in YYYY-MM-DD format',
    ]);
  });

  it('does not repeat the ordering error when the check-in is invalid', async () => {
    expect(await messages(sample('not-a-date', '2026-11-18'))).toEqual([
      'checkIn must be a valid calendar date in YYYY-MM-DD format',
    ]);
  });
});
