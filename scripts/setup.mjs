import {
  BACKEND,
  copyEnvIfMissing,
  ensureDockerRunning,
  ensureNodeVersion,
  FRONTEND,
  paint,
  ROOT,
  runSync,
  startDatabase,
} from './lib.mjs';

// Jednorazowa konfiguracja projektu na nowej maszynie. Można ją bezpiecznie uruchamiać ponownie, np. po pobraniu nowych zależności.
// Uruchomienie: npm run setup (DamianTchorzewski_72206)
ensureNodeVersion();
ensureDockerRunning();

console.log(paint('green', '\n[1/5] Configuration files'));
copyEnvIfMissing(ROOT);
copyEnvIfMissing(BACKEND);

console.log(paint('green', '\n[2/5] Database'));
startDatabase();

// npm ci instaluje dokładnie wersje z package-lock.json i nie zmienia tego pliku, w przeciwieństwie do npm install. (DamianTchorzewski_72206)
console.log(paint('green', '\n[3/5] Dependencies'));
runSync('Installing backend dependencies', 'npm', ['ci'], BACKEND);
runSync('Installing frontend dependencies', 'npm', ['ci'], FRONTEND);

console.log(paint('green', '\n[4/5] Database schema'));
runSync('Generating the Prisma client', 'npx', ['prisma', 'generate'], BACKEND);
runSync('Applying migrations', 'npx', ['prisma', 'migrate', 'deploy'], BACKEND);

console.log(paint('green', '\n[5/5] Demo data'));
runSync('Seeding the database', 'npm', ['run', 'db:seed'], BACKEND);

console.log(
  `\n${paint('green', 'Done.')} Start the project with: ${paint('cyan', 'npm start')}\n`,
);
