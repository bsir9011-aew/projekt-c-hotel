// Dekoratory class-transformer wymagają polyfilla metadanych, więc moduł nie może zależeć od kolejności importów. (DamianTchorzewski_72206)
import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

// Zmienne środowiskowe wymagane przez aplikację wraz z wartościami domyślnymi. (DamianTchorzewski_72206)
export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  // Wartości z process.env są tekstem, więc port wymaga jawnej konwersji na liczbę. (DamianTchorzewski_72206)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  // Adres frontendu dopuszczony przez CORS. (DamianTchorzewski_72206)
  @IsUrl({ require_tld: false, require_protocol: true })
  FRONTEND_URL: string = 'http://localhost:5173';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;
}

// Waliduje konfigurację przy starcie, dzięki czemu aplikacja nie uruchomi się z błędnymi ustawieniami. (DamianTchorzewski_72206)
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(validated);

  if (errors.length > 0) {
    const details = errors
      .map(
        (error) =>
          `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('; ');
    throw new Error(`Invalid environment configuration - ${details}`);
  }

  return validated;
}
