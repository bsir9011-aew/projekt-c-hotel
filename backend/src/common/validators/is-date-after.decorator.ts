import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { isCalendarDate } from './is-calendar-date.decorator.js';

// Wymaga, aby data była późniejsza niż data z innego pola tego samego obiektu (np. checkOut po checkIn). (DamianTchorzewski_72206)
export function IsDateAfter(
  relatedProperty: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isDateAfter',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [relatedProperty],
      options: {
        message: ({ property, constraints }) =>
          `${property} must be later than ${String(constraints[0])}`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [related] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[
            related
          ];

          // Niepoprawny format zgłasza IsCalendarDate, więc nie dublujemy komunikatu. (DamianTchorzewski_72206)
          if (!isCalendarDate(value) || !isCalendarDate(relatedValue)) {
            return true;
          }

          // Format RRRR-MM-DD pozwala porównywać daty jako zwykłe teksty. (DamianTchorzewski_72206)
          return value > relatedValue;
        },
      },
    });
  };
}
