import type { ValidationError } from 'class-validator';
import { ApiException } from './api-exception.js';
import type { ErrorDetailDto } from './error-response.dto.js';

// Spłaszcza zagnieżdżone błędy class-validator do listy par pole-komunikat. (DamianTchorzewski_72206)
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ErrorDetailDto[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));

    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

// Używana jako exceptionFactory w ValidationPipe, aby błędy walidacji miały format kontraktu. (DamianTchorzewski_72206)
export function validationExceptionFactory(
  errors: ValidationError[],
): ApiException {
  return ApiException.validation(flattenValidationErrors(errors));
}
