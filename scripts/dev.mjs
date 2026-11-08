import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BACKEND,
  ensureDockerRunning,
  ensureNodeVersion,
  fail,
  FRONTEND,
  killTree,
  paint,
  startDatabase,
  startLongRunning,
} from './lib.mjs';

// Uruchamia całe środowisko deweloperskie jednym poleceniem: bazę, backend i frontend, z oznaczonym wyjściem każdego z nich.
// Uruchomienie: npm start. Zatrzymanie: Ctrl+C. (DamianTchorzewski_72206)
const API_URL = 'http://localhost:3000/api/v1';
const WEB_URL = 'http://localhost:5173';
const READY_TIMEOUT_MS = 90_000;

ensureNodeVersion();

for (const directory of [BACKEND, FRONTEND]) {
  if (!existsSync(resolve(directory, 'node_modules'))) {
    fail(
      'Dependencies are not installed yet. Run "npm run setup" once, then "npm start".',
    );
  }
}
if (!existsSync(resolve(BACKEND, '.env'))) {
  fail('backend/.env is missing. Run "npm run setup" once, then "npm start".');
}

ensureDockerRunning();
startDatabase();

// Domyślnie "nest start --watch" czyści ekran przy każdej kompilacji, co kasowałoby logi frontendu, więc wyłączamy to flagą. (DamianTchorzewski_72206)
const children = [
  startLongRunning(
    'api',
    'cyan',
    'npm',
    ['run', 'start:dev', '--', '--preserveWatchOutput'],
    BACKEND,
  ),
  startLongRunning('web', 'magenta', 'npm', ['run', 'dev'], FRONTEND),
];

let stopping = false;

// Zatrzymanie jednego procesu zatrzymuje drugi, aby w tle nie zostawał osierocony serwer. (DamianTchorzewski_72206)
function stopAll(exitCode) {
  if (stopping) {
    return;
  }
  stopping = true;
  console.log(`\n${paint('yellow', 'Stopping the API and the frontend...')}`);
  children.forEach(killTree);
  console.log('The database keeps running. Stop it with: npm run db:stop');
  process.exit(exitCode);
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(
        `${paint('red', 'A process exited unexpectedly')} (code ${code}).`,
      );
      stopAll(code ?? 1);
    }
  });
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

// Informuje, kiedy backend faktycznie odpowiada, bo kompilacja w trybie watch trwa kilka sekund. (DamianTchorzewski_72206)
async function waitForApi() {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline && !stopping) {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        console.log(
          `\n${paint('green', 'Ready.')}\n  Frontend:  ${WEB_URL}\n  API:       ${API_URL}\n  Swagger:   http://localhost:3000/api/docs\n  Stop:      Ctrl+C\n`,
        );
        return;
      }
    } catch {
      // Serwer jeszcze się uruchamia, więc próbujemy ponownie. (DamianTchorzewski_72206)
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }

  if (!stopping) {
    console.error(
      paint(
        'yellow',
        'The API did not answer within 90 seconds. Check the [api] output above.',
      ),
    );
  }
}

await waitForApi();
