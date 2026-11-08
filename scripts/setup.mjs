import {
  BACKEND,
  copyEnvIfMissing,
  ensureDockerRunning,
  ensureNodeVersion,
  ensurePortsFree,
  FRONTEND,
  paint,
  readApiPort,
  ROOT,
  runSync,
  startDatabase,
} from './lib.mjs';

// Jednorazowa konfiguracja projektu na nowej maszynie. Można ją bezpiecznie uruchamiać ponownie, np. po pobraniu nowych zależności.
// Uruchomienie: npm run setup (DamianTchorzewski_72206)
const INSTALL_HINT =
  'If npm reports EPERM or "operation not permitted", something still uses files in node_modules: stop "npm start" and any running Vite or Nest process (also in other terminals), then run "npm run setup" again.';

ensureNodeVersion();
ensureDockerRunning();

// Działający serwer blokuje pliki w node_modules (Windows), więc instalacja psułaby katalog. Sprawdzamy to, zanim cokolwiek zmienimy. (DamianTchorzewski_72206)
await ensurePortsFree([
  { port: readApiPort(), name: 'API' },
  { port: 5173, name: 'frontend' },
]);

console.log(paint('green', '\n[1/5] Configuration files'));
copyEnvIfMissing(ROOT);
copyEnvIfMissing(BACKEND);

console.log(paint('green', '\n[2/5] Database'));
startDatabase();

// npm ci instaluje dokładnie wersje z package-lock.json i nie zmienia tego pliku, w przeciwieństwie do npm install. (DamianTchorzewski_72206)
console.log(paint('green', '\n[3/5] Dependencies'));
runSync('Installing backend dependencies', 'npm', ['ci'], BACKEND, INSTALL_HINT);
runSync(
  'Installing frontend dependencies',
  'npm',
  ['ci'],
  FRONTEND,
  INSTALL_HINT,
);

console.log(paint('green', '\n[4/5] Database schema'));
runSync('Generating the Prisma client', 'npx', ['prisma', 'generate'], BACKEND);
runSync('Applying migrations', 'npx', ['prisma', 'migrate', 'deploy'], BACKEND);

console.log(paint('green', '\n[5/5] Demo data'));
runSync('Seeding the database', 'npm', ['run', 'db:seed'], BACKEND);

console.log(
  `\n${paint('green', 'Done.')} Start the project with: ${paint('cyan', 'npm start')}\n`,
);
