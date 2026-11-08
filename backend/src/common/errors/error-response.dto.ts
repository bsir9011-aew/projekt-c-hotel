import { ApiProperty } from '@nestjs/swagger';
import { ApiErrorCode } from './api-error-code.enum.js';

export class ErrorDetailDto {
  @ApiProperty({
    description: 'Path of the invalid field, using dots for nested objects',
    example: 'guestDetails.email',
  })
  field: string;

  @ApiProperty({
    description: 'What is wrong with the field',
    example: 'email must be an email',
  })
  message: string;
}

// Jednolity format każdej odpowiedzi błędu w całym API. (DamianTchorzewski_72206)
export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code', example: 409 })
  statusCode: number;

  @ApiProperty({ description: 'HTTP reason phrase', example: 'Conflict' })
  error: string;

  @ApiProperty({
    description: 'Stable machine-readable error code',
    enum: ApiErrorCode,
    enumName: 'ApiErrorCode',
    example: ApiErrorCode.ROOM_NOT_AVAILABLE,
  })
  code: ApiErrorCode;

  @ApiProperty({
    description: 'Human-readable description of the problem',
    example: 'The room is not available for the selected dates.',
  })
  message: string;

  @ApiProperty({
    description:
      'Per-field problems, empty when the error is not field related',
    type: [ErrorDetailDto],
  })
  details: ErrorDetailDto[];

  @ApiProperty({ format: 'date-time', example: '2026-11-08T15:30:00.000Z' })
  timestamp: string;

  @ApiProperty({
    description: 'Requested path without the query string',
    example: '/api/v1/bookings',
  })
  path: string;
}
