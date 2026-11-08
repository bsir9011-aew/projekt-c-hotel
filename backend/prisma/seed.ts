import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedDatabase } from './seed-data.js';

// Punkt wejścia polecenia "npx prisma db seed". Dane i logika są w seed-data.ts, aby testy mogły z nich korzystać. (DamianTchorzewski_72206)
const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const summary = await seedDatabase(prisma);
  console.log(
    `Seeded ${summary.rooms} rooms, ${summary.packages} packages and ${summary.bookings} demo bookings.`,
  );
} finally {
  await prisma.$disconnect();
}
