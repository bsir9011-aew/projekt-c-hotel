import { HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ApiErrorCode } from './api-error-code.enum.js';
import {
  flattenValidationErrors,
  validationExceptionFactory,
} from './validation-exception.factory.js';

function error(
  property: string,
  constraints?: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError {
  return { property, constraints, children } as ValidationError;
}

describe('flattenValidationErrors', () => {
  it('returns one entry per violated constraint', () => {
    const result = flattenValidationErrors([
      error('guestsCount', {
        isInt: 'guestsCount must be an integer number',
        min: 'guestsCount must not be less than 1',
      }),
    ]);

    expect(result).toEqual([
      {
        field: 'guestsCount',
        message: 'guestsCount must be an integer number',
      },
      { field: 'guestsCount', message: 'guestsCount must not be less than 1' },
    ]);
  });

  it('joins nested property names with dots', () => {
    const result = flattenValidationErrors([
      error('guestDetails', undefined, [
        error('email', { isEmail: 'email must be an email' }),
      ]),
    ]);

    expect(result).toEqual([
      { field: 'guestDetails.email', message: 'email must be an email' },
    ]);
  });

  it('returns an empty list when there are no errors', () => {
    expect(flattenValidationErrors([])).toEqual([]);
  });
});

describe('validationExceptionFactory', () => {
  it('creates a 400 VALIDATION_ERROR exception with the field details', () => {
    const exception = validationExceptionFactory([
      error('roomId', { isUuid: 'roomId must be a UUID' }),
    ]);

    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(exception.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    expect(exception.details).toEqual([
      { field: 'roomId', message: 'roomId must be a UUID' },
    ]);
  });
});
