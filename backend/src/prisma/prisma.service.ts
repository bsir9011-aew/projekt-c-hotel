import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaClient } from '../generated/prisma/client.js';

// Jedyna warstwa komunikująca się z bazą danych. Pozostałe moduły wstrzykują ten serwis. (DamianTchorzewski_72206)
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    // Prisma 7 łączy się z bazą przez adapter sterownika pg. (DamianTchorzewski_72206)
    const adapter = new PrismaPg({
      connectionString: configService.get('DATABASE_URL', { infer: true }),
    });
    super({ adapter });
  }

  // Błąd połączenia przerywa start aplikacji zamiast ujawnić się przy pierwszym żądaniu. (DamianTchorzewski_72206)
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
