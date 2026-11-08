import { registerDecorator, type ValidationOptions } from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Sprawdza, czy tekst to istniejąca data kalendarzowa w formacie RRRR-MM-DD (np. odrzuca 2026-02-30). (DamianTchorzewski_72206)
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function IsCalendarDate(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isCalendarDate',
      target: target.constructor,
      propertyName: propertyName as string,
      options: {
        message: ({ property }) =>
          `${property} must be a valid calendar date in YYYY-MM-DD format`,
        ...validationOptions,
      },
      validator: {
        validate: (value: unknown) => isCalendarDate(value),
      },
    });
  };
}
