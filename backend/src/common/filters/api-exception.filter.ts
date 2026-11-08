import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { STATUS_CODES } from 'node:http';
import { ApiErrorCode } from '../errors/api-error-code.enum.js';
import { ApiException } from '../errors/api-exception.js';
import type { ErrorResponseDto } from '../errors/error-response.dto.js';

// Kody ogólne dla wyjątków, które nie niosą kodu domenowego. (DamianTchorzewski_72206)
const CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ApiErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ApiErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ApiErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ApiErrorCode.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorCode.UNPROCESSABLE_ENTITY,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.TOO_MANY_REQUESTS,
  [HttpStatus.NOT_IMPLEMENTED]: ApiErrorCode.NOT_IMPLEMENTED,
  [HttpStatus.SERVICE_UNAVAILABLE]: ApiErrorCode.SERVICE_UNAVAILABLE,
};

// Zamienia każdy wyjątek na odpowiedź w jednolitym formacie ErrorResponseDto. (DamianTchorzewski_72206)
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const context = host.switchToHttp();
    const request: unknown = context.getRequest();

    // Query string może zawierać dane osobowe, więc nie trafia do odpowiedzi. (DamianTchorzewski_72206)
    const path = (httpAdapter.getRequestUrl(request) as string).split('?')[0];
    const body = this.toErrorResponse(exception, path);

    httpAdapter.reply(context.getResponse(), body, body.statusCode);
  }

  private toErrorResponse(exception: unknown, path: string): ErrorResponseDto {
    const timestamp = new Date().toISOString();

    if (exception instanceof ApiException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        error: STATUS_CODES[status] ?? 'Error',
        code: exception.code,
        message: exception.message,
        details: exception.details,
        timestamp,
        path,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        error: STATUS_CODES[status] ?? 'Error',
        code: CODE_BY_STATUS[status] ?? ApiErrorCode.INTERNAL_ERROR,
        message: this.extractMessage(exception),
        details: [],
        timestamp,
        path,
      };
    }

    // Nieoczekiwany błąd: szczegóły trafiają do logów, a klient dostaje ogólny komunikat. (DamianTchorzewski_72206)
    this.logger.error(
      `Unhandled exception on ${path}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR] ?? 'Error',
      code: ApiErrorCode.INTERNAL_ERROR,
      message: 'Internal server error.',
      details: [],
      timestamp,
      path,
    };
  }

  private extractMessage(exception: HttpException): string {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) {
      return message.join('; ');
    }

    return typeof message === 'string' ? message : exception.message;
  }
}
