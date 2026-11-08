import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation.js';
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
    PrismaModule,
    HealthModule,
    RoomsModule,
    PackagesModule,
    BookingsModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
