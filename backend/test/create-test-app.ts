import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Baza jest podstawiona atrapą, więc testy e2e nie wymagają działającego PostgreSQL. (DamianTchorzewski_72206)
export const prismaMock = {
  $queryRaw: vi.fn(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

// Tworzy aplikację skonfigurowaną tak samo jak produkcyjna (prefiks, walidacja, filtr błędów, Swagger). (DamianTchorzewski_72206)
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  setupApp(app);
  await app.init();

  return app;
}
