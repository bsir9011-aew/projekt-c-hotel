import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { flattenValidationErrors } from '../../../common/errors/validation-exception.factory.js';
import { VALIDATION_OPTIONS } from '../../../common/validation/validation.options.js';
import { BookingCodeParamDto } from './booking-code-param.dto.js';
import { CancelBookingDto } from './cancel-booking.dto.js';
import { CreateBookingDto } from './create-booking.dto.js';

// Odtwarza zachowanie ValidationPipe z app.setup.ts: konwersję oraz te same opcje walidacji. (DamianTchorzewski_72206)
async function check<T extends object>(
  type: ClassConstructor<T>,
  body: Record<string, unknown>,
) {
  const instance = plainToInstance(type, body);
  const errors = await validate(instance, VALIDATION_OPTIONS);

  return { instance, details: flattenValidationErrors(errors) };
}

const fields = (details: { field: string }[]) =>
  details.map((detail) => detail.field);

const validBooking = {
  roomId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
  packageId: '3f1c9b52-8d3e-4c55-9a43-6a1f2f0d7b11',
  checkIn: '2026-11-15',
  checkOut: '2026-11-18',
  guestsCount: 2,
  guestDetails: {
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 'jan.kowalski@example.com',
    phone: '+48123456789',
  },
  voucherCode: 'JESIEN2026',
};

describe('CreateBookingDto', () => {
  it('accepts a complete valid booking', async () => {
    expect((await check(CreateBookingDto, validBooking)).details).toEqual([]);
  });

  it('accepts a booking without a package and voucher', async () => {
    const { packageId: _p, voucherCode: _v, ...minimal } = validBooking;

    expect((await check(CreateBookingDto, minimal)).details).toEqual([]);
  });

  it('accepts a null package', async () => {
    const body = { ...validBooking, packageId: null };

    expect((await check(CreateBookingDto, body)).details).toEqual([]);
  });

  it('lists every missing required field', async () => {
    const { details } = await check(CreateBookingDto, {});

    expect(fields(details)).toEqual([
      'roomId',
      'checkIn',
      'checkOut',
      'guestsCount',
      'guestDetails',
    ]);
  });

  it('reports one message per field, about the type when the value is missing', async () => {
    const { details } = await check(CreateBookingDto, {
      ...validBooking,
      guestsCount: undefined,
    });

    expect(details).toEqual([
      {
        field: 'guestsCount',
        message: 'guestsCount must be an integer number',
      },
    ]);
  });

  it('reports a range message once the type is correct', async () => {
    const { details } = await check(CreateBookingDto, {
      ...validBooking,
      guestsCount: 0,
    });

    expect(details).toEqual([
      { field: 'guestsCount', message: 'guestsCount must not be less than 1' },
    ]);
  });

  it('reports nested guest errors with a dotted path', async () => {
    const body = {
      ...validBooking,
      guestDetails: { ...validBooking.guestDetails, email: 'not-an-email' },
    };

    expect(fields((await check(CreateBookingDto, body)).details)).toEqual([
      'guestDetails.email',
    ]);
  });

  it('trims guest data before validating it', async () => {
    const body = {
      ...validBooking,
      guestDetails: {
        ...validBooking.guestDetails,
        firstName: '  Jan  ',
        email: ' jan.kowalski@example.com ',
      },
    };
    const { instance, details } = await check(CreateBookingDto, body);

    expect(details).toEqual([]);
    expect(instance.guestDetails.firstName).toBe('Jan');
    expect(instance.guestDetails.email).toBe('jan.kowalski@example.com');
  });

  it('rejects a blank first name', async () => {
    const body = {
      ...validBooking,
      guestDetails: { ...validBooking.guestDetails, firstName: '   ' },
    };

    expect(fields((await check(CreateBookingDto, body)).details)).toEqual([
      'guestDetails.firstName',
    ]);
  });

  it.each(['+48 123 456 789', '123-456-789', '48123456789'])(
    'accepts the phone number %s',
    async (phone) => {
      const body = {
        ...validBooking,
        guestDetails: { ...validBooking.guestDetails, phone },
      };

      expect((await check(CreateBookingDto, body)).details).toEqual([]);
    },
  );

  it.each(['abc', '12', '+48 (12) 345', '123456789012345678901'])(
    'rejects the phone number %s',
    async (phone) => {
      const body = {
        ...validBooking,
        guestDetails: { ...validBooking.guestDetails, phone },
      };

      expect(fields((await check(CreateBookingDto, body)).details)).toEqual([
        'guestDetails.phone',
      ]);
    },
  );

  it.each([0, 21, 1.5, '2'])('rejects guestsCount=%j', async (guestsCount) => {
    const body = { ...validBooking, guestsCount };

    expect(fields((await check(CreateBookingDto, body)).details)).toEqual([
      'guestsCount',
    ]);
  });

  it('rejects a package id that is not a UUID', async () => {
    const body = { ...validBooking, packageId: 'package-1' };

    expect(fields((await check(CreateBookingDto, body)).details)).toEqual([
      'packageId',
    ]);
  });

  it('rejects a voucher code with spaces', async () => {
    const body = { ...validBooking, voucherCode: 'JESIEN 2026' };

    expect(fields((await check(CreateBookingDto, body)).details)).toEqual([
      'voucherCode',
    ]);
  });

  it('rejects a check-out that is not later than the check-in', async () => {
    const body = { ...validBooking, checkOut: '2026-11-15' };

    expect((await check(CreateBookingDto, body)).details).toEqual([
      { field: 'checkOut', message: 'checkOut must be later than checkIn' },
    ]);
  });

  it('rejects unknown fields, also inside guestDetails', async () => {
    const body = {
      ...validBooking,
      totalPrice: 1,
      guestDetails: { ...validBooking.guestDetails, age: 30 },
    };

    expect(fields((await check(CreateBookingDto, body)).details)).toEqual([
      'totalPrice',
      'guestDetails.age',
    ]);
  });
});

describe('CancelBookingDto', () => {
  const valid = {
    bookingCode: 'HTL-2026-X89B',
    email: 'jan.kowalski@example.com',
    reason: 'Zmiana planów wyjazdowych',
  };

  it('accepts a valid request', async () => {
    expect((await check(CancelBookingDto, valid)).details).toEqual([]);
  });

  it('accepts a request without a reason', async () => {
    const { reason: _r, ...withoutReason } = valid;

    expect((await check(CancelBookingDto, withoutReason)).details).toEqual([]);
  });

  it('normalizes the booking code typed in lower case with spaces', async () => {
    const { instance, details } = await check(CancelBookingDto, {
      ...valid,
      bookingCode: '  htl-2026-x89b ',
    });

    expect(details).toEqual([]);
    expect(instance.bookingCode).toBe('HTL-2026-X89B');
  });

  it.each([
    'HTL-26-X89B',
    'HTL-2026-X89',
    'HTL-2026-X89BB',
    'HTL-2026-XO9B',
    'HTL-2026-X1LB',
    'ABC-2026-X89B',
  ])('rejects the booking code %s', async (bookingCode) => {
    expect(
      fields(
        (await check(CancelBookingDto, { ...valid, bookingCode })).details,
      ),
    ).toEqual(['bookingCode']);
  });

  it('rejects an invalid e-mail', async () => {
    expect(
      fields(
        (await check(CancelBookingDto, { ...valid, email: 'jan@' })).details,
      ),
    ).toEqual(['email']);
  });

  it('rejects a reason longer than 500 characters', async () => {
    const reason = 'a'.repeat(501);

    expect(
      fields((await check(CancelBookingDto, { ...valid, reason })).details),
    ).toEqual(['reason']);
  });
});

describe('BookingCodeParamDto', () => {
  it('normalizes and accepts a valid code', async () => {
    const { instance, details } = await check(BookingCodeParamDto, {
      bookingCode: 'htl-2026-x89b',
    });

    expect(details).toEqual([]);
    expect(instance.bookingCode).toBe('HTL-2026-X89B');
  });

  it('rejects a malformed code', async () => {
    expect(
      fields(
        (await check(BookingCodeParamDto, { bookingCode: 'abc' })).details,
      ),
    ).toEqual(['bookingCode']);
  });
});
