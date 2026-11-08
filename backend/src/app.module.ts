import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  DEFAULT_RATE_LIMIT,
  RATE_LIMIT_WINDOW_MS,
} from './common/rate-limit/rate-limit.constants.js';
import {
  validateEnv,
  type EnvironmentVariables,
} from './config/env.validation.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { PackagesModule } from './modules/packages/packages.module.js';
import { RoomsModule } from './modules/rooms/rooms.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    // Konfiguracja jest walidowana przy starcie i dostępna globalnie. (DamianTchorzewski_72206)
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Limit żądań na adres IP. Można go wyłączyć zmienną RATE_LIMIT_ENABLED, np. w testach. (DamianTchorzewski_72206)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        throttlers: [
          {
            name: 'default',
            ttl: RATE_LIMIT_WINDOW_MS,
            limit: DEFAULT_RATE_LIMIT,
          },
        ],
        skipIf: () => !config.get('RATE_LIMIT_ENABLED', { infer: true }),
        errorMessage: 'Too many requests. Please try again later.',
      }),
    }),
    PrismaModule,
    HealthModule,
    RoomsModule,
    PackagesModule,
    BookingsModule,
    IntegrationsModule,
  ],
  providers: [
    // Globalny strażnik działa przed strażnikami kontrolerów, więc limit obejmuje też żądania bez poprawnego klucza. (DamianTchorzewski_72206)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
