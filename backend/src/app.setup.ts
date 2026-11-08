import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';
import { validationExceptionFactory } from './common/errors/validation-exception.factory.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { VALIDATION_OPTIONS } from './common/validation/validation.options.js';
import type { EnvironmentVariables } from './config/env.validation.js';

export const API_PREFIX = 'api/v1';
export const SWAGGER_PATH = 'api/docs';
export const API_KEY_SECURITY_NAME = 'api-key';

// Wspólna konfiguracja aplikacji dla main.ts i testów e2e, aby testy sprawdzały to samo, co produkcja. (DamianTchorzewski_72206)
export function setupApp(app: INestApplication): void {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  // Wszystkie endpointy są dostępne pod wspólnym, wersjonowanym prefiksem. (DamianTchorzewski_72206)
  app.setGlobalPrefix(API_PREFIX);

  // CORS dopuszcza tylko frontend wskazany w konfiguracji. (DamianTchorzewski_72206)
  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Odrzuca nieznane pola i konwertuje dane wejściowe na typy z DTO. (DamianTchorzewski_72206)
  app.useGlobalPipes(
    new ValidationPipe({
      ...VALIDATION_OPTIONS,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // Każdy błąd, także nieoczekiwany, wychodzi w jednolitym formacie z kontraktu API. (DamianTchorzewski_72206)
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));

  // Swagger musi być skonfigurowany po prefiksie, aby ścieżki w dokumentacji były poprawne. (DamianTchorzewski_72206)
  SwaggerModule.setup(SWAGGER_PATH, app, createOpenApiDocument(app));
}

// Buduje dokument OpenAPI, który jest maszynowo odczytywalną wersją kontraktu API. (DamianTchorzewski_72206)
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const options = new DocumentBuilder()
    .setTitle('Hotel C REST API')
    .setDescription(
      'Hotel system API: rooms, holiday packages, bookings and integrations with partner teams (massage, fitness, vouchers).',
    )
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', name: 'X-API-Key', in: 'header' },
      API_KEY_SECURITY_NAME,
    )
    .addTag('health', 'Application and database status')
    .addTag('rooms', 'Room search and details')
    .addTag('packages', 'Holiday packages')
    .addTag('bookings', 'Creating and cancelling bookings')
    .addTag(
      'integrations',
      'Endpoints for partner teams: massage, fitness and vouchers',
    )
    .build();

  return SwaggerModule.createDocument(app, options);
}
