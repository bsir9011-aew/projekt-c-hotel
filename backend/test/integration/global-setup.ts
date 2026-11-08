import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';
import { assertTestDatabase, TEST_DATABASE_URL } from './test-database.js';

// Tworzy bazę testową, jeśli jej nie ma. Łączy się przez bazę administracyjną "postgres". (DamianTchorzewski_72206)
async function ensureDatabaseExists(url: string, name: string): Promise<void> {
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';

  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();

  try {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );

    if (existing.rowCount === 0) {
      // Nazwa przeszła walidację w assertTestDatabase, więc można ją bezpiecznie wstawić do polecenia. (DamianTchorzewski_72206)
      await client.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await client.end();
  }
}

// Uruchamiane raz przed wszystkimi testami integracyjnymi: baza i migracje są gotowe. (DamianTchorzewski_72206)
export default async function setup(): Promise<void> {
  const name = assertTestDatabase(TEST_DATABASE_URL);
  await ensureDatabaseExists(TEST_DATABASE_URL, name);

  execSync('npx prisma migrate deploy', {
    cwd: resolve(import.meta.dirname, '../..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}
