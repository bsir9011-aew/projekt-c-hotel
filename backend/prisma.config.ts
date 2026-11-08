import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Konfiguracja Prisma CLI: lokalizacja schematu, migracji i adres bazy danych. (DamianTchorzewski_72206)
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Polecenie "prisma db seed" uruchamia skrypt z danymi demonstracyjnymi. (DamianTchorzewski_72206)
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Adres bazy pochodzi ze zmiennej środowiskowej (plik .env lub CI). (DamianTchorzewski_72206)
    url: process.env['DATABASE_URL'],
  },
});
