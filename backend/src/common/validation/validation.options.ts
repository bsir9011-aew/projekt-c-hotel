import type { ValidatorOptions } from 'class-validator';

// Wspólne opcje walidacji dla ValidationPipe i testów DTO, aby oba zachowywały się tak samo. (DamianTchorzewski_72206)
//
// stopAtFirstError zwraca jeden błąd na pole. class-validator wykonuje dekoratory od dołu,
// więc w DTO walidator typu (np. IsInt) należy umieszczać pod walidatorami zakresu (Min, Max),
// żeby brakująca wartość dostała komunikat o typie, a nie o zakresie. (DamianTchorzewski_72206)
export const VALIDATION_OPTIONS: ValidatorOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  stopAtFirstError: true,
};
