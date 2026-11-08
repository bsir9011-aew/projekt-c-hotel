import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { assertTestDatabase, TEST_DATABASE_URL } from './test-database.js';

export interface IntegrationApp {
  app: INestApplication<App>;
  prisma: PrismaService;
}

// Prawdziwa aplikacja z prawdziwą bazą testową, bez żadnych atrap. Konfiguracja jest taka sama jak produkcyjna. (DamianTchorzewski_72206)
export async function createIntegrationApp(): Promise<IntegrationApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  setupApp(app);
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

// Czyści wszystkie tabele przed każdym testem. Odmawia pracy na bazie, której nazwa nie kończy się na "_test". (DamianTchorzewski_72206)
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL);

  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "bookings", "rooms", "packages" RESTART IDENTITY CASCADE',
  );
}
