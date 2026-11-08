import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { EnvironmentVariables } from './config/env.validation.js';

export const API_PREFIX = 'api/v1';
export const SWAGGER_PATH = 'api/docs';

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
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger musi być skonfigurowany po prefiksie, aby ścieżki w dokumentacji były poprawne. (DamianTchorzewski_72206)
  setupSwagger(app);
}

function setupSwagger(app: INestApplication): void {
  const options = new DocumentBuilder()
    .setTitle('Hotel C REST API')
    .setDescription(
      'Hotel system API: rooms, holiday packages, bookings and integrations with partner teams (massage, fitness, vouchers).',
    )
    .setVersion('1.0.0')
    .addTag('health', 'Application and database status')
    .addTag('rooms', 'Room search and details')
    .addTag('packages', 'Holiday packages')
    .addTag('bookings', 'Creating and cancelling bookings')
    .addTag(
      'integrations',
      'Endpoints for partner teams: massage, fitness and vouchers',
    )
    .build();

  SwaggerModule.setup(
    SWAGGER_PATH,
    app,
    SwaggerModule.createDocument(app, options),
  );
}
