import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');
export const BACKEND = resolve(ROOT, 'backend');
export const FRONTEND = resolve(ROOT, 'frontend');

const MINIMUM_NODE = { major: 22, minor: 12 };
const DOCKER_CHECK_TIMEOUT_MS = 20_000;

const isWindows = process.platform === 'win32';
const COLORS = { red: 31, green: 32, yellow: 33, cyan: 36, magenta: 35 };

export function paint(color, text) {
  return process.stdout.isTTY
    ? `\u001b[${COLORS[color]}m${text}\u001b[0m`
    : text;
}

export function fail(message) {
  console.error(`\n${paint('red', 'Error:')} ${message}\n`);
  process.exit(1);
}

// Backend używa Prisma 7, która wymaga nowszego Node.js, więc sprawdzamy to na starcie z czytelnym komunikatem. (DamianTchorzewski_72206)
export function ensureNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);

  if (
    major < MINIMUM_NODE.major ||
    (major === MINIMUM_NODE.major && minor < MINIMUM_NODE.minor)
  ) {
    fail(
      `Node.js ${MINIMUM_NODE.major}.${MINIMUM_NODE.minor} or newer is required, found ${process.versions.node}.`,
    );
  }
}

// Zawieszony Docker Desktop potrafi nie odpowiadać wcale, dlatego sprawdzenie ma limit czasu zamiast czekać w nieskończoność. (DamianTchorzewski_72206)
export function ensureDockerRunning() {
  const result = spawnSync('docker', ['info'], {
    stdio: 'ignore',
    timeout: DOCKER_CHECK_TIMEOUT_MS,
    shell: isWindows,
  });

  if (result.error?.code === 'ENOENT') {
    fail(
      'Docker is not installed. Install Docker Desktop and run this command again.',
    );
  }
  if (result.status !== 0) {
    fail(
      'Docker is not running or does not respond. Start Docker Desktop, wait until it says "running", and try again.',
    );
  }
}

export function runSync(label, command, args, cwd = ROOT) {
  console.log(`${paint('cyan', '>')} ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: isWindows,
  });

  if (result.status !== 0) {
    fail(`The step "${label}" failed.`);
  }
}

// Kopiuje przykładowy plik konfiguracji tylko wtedy, gdy własnego jeszcze nie ma, aby nie nadpisać ustawień członka zespołu. (DamianTchorzewski_72206)
export function copyEnvIfMissing(directory) {
  const target = resolve(directory, '.env');
  const example = resolve(directory, '.env.example');

  if (existsSync(target)) {
    console.log(
      `${paint('cyan', '>')} ${target} already exists, leaving it as it is`,
    );
    return;
  }

  copyFileSync(example, target);
  console.log(`${paint('cyan', '>')} created ${target} from .env.example`);
}

export function startDatabase() {
  // --wait kończy się dopiero, gdy baza przyjmuje połączenia (healthcheck z docker-compose.yml). (DamianTchorzewski_72206)
  runSync('Starting PostgreSQL (docker compose)', 'docker', [
    'compose',
    'up',
    '-d',
    '--wait',
  ]);
}

// Uruchamia proces długo działający i dopisuje do każdej linii jego wyjścia kolorowy prefiks. (DamianTchorzewski_72206)
export function startLongRunning(name, color, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    shell: isWindows,
    detached: !isWindows,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const prefix = paint(color, `[${name}]`);
  const forward = (stream, target) => {
    let buffered = '';
    stream.on('data', (chunk) => {
      buffered += chunk.toString();
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() ?? '';
      for (const line of lines) {
        target.write(`${prefix} ${line}\n`);
      }
    });
  };
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  return child;
}

// Zatrzymuje całe drzewo procesów, bo npm uruchamia dalsze procesy (nest, vite), które inaczej zostałyby w tle. (DamianTchorzewski_72206)
export function killTree(child) {
  if (child.exitCode !== null || child.pid === undefined) {
    return;
  }

  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // Proces już zakończył działanie. (DamianTchorzewski_72206)
  }
}
