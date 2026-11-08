import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../errors/error-response.dto.js';

// Dokumentuje odpowiedzi błędów endpointu: klucz to status HTTP, wartość to opis sytuacji. (DamianTchorzewski_72206)
export function ApiErrorResponses(
  descriptions: Partial<Record<number, string>>,
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ...Object.entries(descriptions).map(([status, description]) =>
      ApiResponse({
        status: Number(status),
        description,
        type: ErrorResponseDto,
      }),
    ),
  );
}
