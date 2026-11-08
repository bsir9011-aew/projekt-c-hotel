import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import {
  BACKEND,
  ensureDockerRunning,
  ensurePortsFree,
  ensureNodeVersion,
  fail,
  FRONTEND,
  hasInstalledDependencies,
  killTree,
  paint,
  readApiPort,
  startDatabase,
  startLongRunning,
} from './lib.mjs';

// Uruchamia całe środowisko deweloperskie jednym poleceniem: bazę, backend i frontend, z oznaczonym wyjściem każdego z nich.
// Uruchomienie: npm start. Zatrzymanie: Ctrl+C. (DamianTchorzewski_72206)
const API_PORT = readApiPort();
const WEB_PORT = 5173;
const API_URL = `http://localhost:${API_PORT}/api/v1`;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const READY_TIMEOUT_MS = 90_000;

ensureNodeVersion();

// Komunikat wskazuje, w którym projekcie brakuje zależności, bo backend i frontend instalują się osobno. (DamianTchorzewski_72206)
for (const directory of [BACKEND, FRONTEND]) {
  if (!hasInstalledDependencies(directory)) {
    fail(
      `Dependencies of ${basename(directory)}/ are not installed (or the installation was interrupted). Run "npm run setup" (it installs both backend/ and frontend/), then "npm start".`,
    );
  }
}
if (!existsSync(resolve(BACKEND, '.env'))) {
  fail('backend/.env is missing. Run "npm run setup" once, then "npm start".');
}

// Bez tego sprawdzenia "Ready" mogłoby pochodzić ze starego, wciąż działającego serwera, a nowy frontend po cichu przeskoczyłby na inny port. (DamianTchorzewski_72206)
await ensurePortsFree([
  { port: API_PORT, name: 'API' },
  { port: WEB_PORT, name: 'frontend' },
]);

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

async function answers(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    // Serwer jeszcze się uruchamia, więc próbujemy ponownie. (DamianTchorzewski_72206)
    return false;
  }
}

// Informuje, kiedy backend i frontend faktycznie odpowiadają, bo kompilacja w trybie watch trwa kilka sekund. (DamianTchorzewski_72206)
async function waitForReady() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let apiReady = false;
  let webReady = false;

  while (Date.now() < deadline && !stopping) {
    apiReady = apiReady || (await answers(`${API_URL}/health`));
    webReady = webReady || (await answers(WEB_URL));

    if (apiReady && webReady) {
      console.log(
        `\n${paint('green', 'Ready.')}\n  Frontend:  ${WEB_URL}\n  API:       ${API_URL}\n  Swagger:   http://localhost:${API_PORT}/api/docs\n  Stop:      Ctrl+C\n`,
      );
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }

  if (!stopping) {
    const waiting = [!apiReady && '[api]', !webReady && '[web]']
      .filter(Boolean)
      .join(' and ');
    console.error(
      paint(
        'yellow',
        `${waiting} did not answer within 90 seconds. Check its output above.`,
      ),
    );
  }
}

await waitForReady();
