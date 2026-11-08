import { Prisma } from '../../generated/prisma/client.js';
import { isExclusionViolation, isUniqueViolation } from './database-errors.js';

function prismaError(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('database error', {
    code,
    clientVersion: 'test',
    meta,
  });
}

describe('isExclusionViolation', () => {
  const overlap = prismaError('P2039', {
    code: '23P01',
    message:
      'conflicting key value violates exclusion constraint "bookings_no_overlap"',
  });

  // Ten sam błąd ma inny układ pól w transakcji interaktywnej, co wykazał test z prawdziwą bazą. (DamianTchorzewski_72206)
  const overlapInTransaction = prismaError('P2039', {
    driverAdapterError: {
      cause: {
        originalMessage:
          'conflicting key value violates exclusion constraint "bookings_no_overlap"',
        kind: 'postgres',
        code: '23P01',
        message:
          'conflicting key value violates exclusion constraint "bookings_no_overlap"',
      },
    },
  });

  it.each([
    ['outside a transaction', overlap],
    ['inside an interactive transaction', overlapInTransaction],
  ])('recognizes the overlap constraint %s', (_label, error) => {
    expect(isExclusionViolation(error, 'bookings_no_overlap')).toBe(true);
  });

  it('does not match the same violation of a different constraint', () => {
    expect(isExclusionViolation(overlapInTransaction, 'other_constraint')).toBe(
      false,
    );
  });

  it('does not match a different constraint', () => {
    expect(isExclusionViolation(overlap, 'other_constraint')).toBe(false);
  });

  it.each([
    ['another Prisma error code', prismaError('P2002')],
    [
      'a check constraint violation',
      prismaError('P2039', { code: '23514', message: 'bookings_no_overlap' }),
    ],
    ['an error without meta', prismaError('P2039')],
    ['a plain error', new Error('bookings_no_overlap')],
    ['a value that is not an error', 'bookings_no_overlap'],
  ])('ignores %s', (_label, error) => {
    expect(isExclusionViolation(error, 'bookings_no_overlap')).toBe(false);
  });
});

describe('isUniqueViolation', () => {
  const duplicate = prismaError('P2002', {
    driverAdapterError: {
      cause: { constraint: { index: 'bookings_booking_code_key' } },
    },
  });

  it('recognizes a duplicated booking code', () => {
    expect(isUniqueViolation(duplicate, 'bookings_booking_code_key')).toBe(
      true,
    );
  });

  it('does not match a unique violation of another constraint', () => {
    expect(isUniqueViolation(duplicate, 'rooms_room_number_key')).toBe(false);
  });

  it.each([
    [
      'another Prisma error code',
      prismaError('P2039', { index: 'bookings_booking_code_key' }),
    ],
    ['a plain error', new Error('bookings_booking_code_key')],
  ])('ignores %s', (_label, error) => {
    expect(isUniqueViolation(error, 'bookings_booking_code_key')).toBe(false);
  });
});
