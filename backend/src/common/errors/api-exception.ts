import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from './api-error-code.enum.js';
import type { ErrorDetailDto } from './error-response.dto.js';

// Wyjątek z kodem domenowym. Serwisy rzucają go zamiast zwykłych wyjątków HTTP,
// aby filtr mógł zwrócić klientowi stabilny kod błędu. (DamianTchorzewski_72206)
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ApiErrorCode,
    message: string,
    readonly details: ErrorDetailDto[] = [],
  ) {
    super(message, status);
  }

  // Reguła biznesowa naruszona przez dane wejściowe, np. data z przeszłości, której nie wyłapie sam DTO. (DamianTchorzewski_72206)
  static validation(details: ErrorDetailDto[]): ApiException {
    return new ApiException(
      HttpStatus.BAD_REQUEST,
      ApiErrorCode.VALIDATION_ERROR,
      'Request validation failed.',
      details,
    );
  }

  // Endpointy z kontraktu, które nie mają jeszcze implementacji. (DamianTchorzewski_72206)
  static notImplemented(): ApiException {
    return new ApiException(
      HttpStatus.NOT_IMPLEMENTED,
      ApiErrorCode.NOT_IMPLEMENTED,
      'This endpoint is not implemented yet.',
    );
  }
}
