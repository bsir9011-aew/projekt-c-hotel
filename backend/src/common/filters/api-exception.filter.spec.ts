import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { ApiErrorCode } from '../errors/api-error-code.enum.js';
import { ApiException } from '../errors/api-exception.js';
import type { ErrorResponseDto } from '../errors/error-response.dto.js';
import { ApiExceptionFilter } from './api-exception.filter.js';

describe('ApiExceptionFilter', () => {
  const reply = vi.fn();
  const response = { response: true };

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  function run(exception: unknown, url = '/api/v1/bookings'): ErrorResponseDto {
    const adapterHost = {
      httpAdapter: { getRequestUrl: () => url, reply },
    } as unknown as HttpAdapterHost;

    new ApiExceptionFilter(adapterHost).catch(exception, host);

    return reply.mock.calls.at(-1)![1] as ErrorResponseDto;
  }

  beforeEach(() => {
    reply.mockReset();
    // Nieoczekiwany błąd jest logowany, a w testach nie chcemy tego szumu. (DamianTchorzewski_72206)
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the domain code, message and details of an ApiException', () => {
    const body = run(
      new ApiException(
        HttpStatus.CONFLICT,
        ApiErrorCode.ROOM_NOT_AVAILABLE,
        'The room is not available for the selected dates.',
        [{ field: 'checkIn', message: 'already booked' }],
      ),
    );

    expect(body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      code: 'ROOM_NOT_AVAILABLE',
      message: 'The room is not available for the selected dates.',
      details: [{ field: 'checkIn', message: 'already booked' }],
      path: '/api/v1/bookings',
    });
    expect(reply).toHaveBeenCalledWith(response, body, 409);
  });

  it('derives the code from the HTTP status of a plain HttpException', () => {
    const body = run(new NotFoundException('Cannot GET /x'));

    expect(body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /x',
      details: [],
    });
  });

  it('joins a list of messages into one text', () => {
    const body = run(new BadRequestException(['first problem', 'second one']));

    expect(body.message).toBe('first problem; second one');
  });

  it('hides the details of an unexpected error', () => {
    const body = run(new Error('password=secret leaked'));

    expect(body).toMatchObject({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error.',
    });
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('removes the query string from the reported path', () => {
    const body = run(new NotFoundException(), '/api/v1/rooms?guests=2');

    expect(body.path).toBe('/api/v1/rooms');
  });

  it('removes the query string from the default not found message', () => {
    const body = run(
      new NotFoundException('Cannot GET /api/v1/rooms?email=jan@example.com'),
    );

    expect(body.message).toBe('Cannot GET /api/v1/rooms');
  });

  it('leaves other messages unchanged', () => {
    const body = run(new NotFoundException('Room ?x=1 was not found'));

    expect(body.message).toBe('Room ?x=1 was not found');
  });

  it('creates a 501 ApiException for endpoints without implementation', () => {
    const body = run(ApiException.notImplemented());

    expect(body).toMatchObject({ statusCode: 501, code: 'NOT_IMPLEMENTED' });
  });
});
