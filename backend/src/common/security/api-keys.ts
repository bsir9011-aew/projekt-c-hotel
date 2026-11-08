import { createHash } from 'node:crypto';

// Format konfiguracji: nazwa:klucz,nazwa:klucz. Nazwa identyfikuje zespół, a klucz musi mieć od 16 do 128 znaków. (DamianTchorzewski_72206)
const ENTRY = '[a-z][a-z0-9-]*:[A-Za-z0-9._~+=/-]{16,128}';
export const INTEGRATION_API_KEYS_PATTERN = new RegExp(
  `^${ENTRY}(,${ENTRY})*$`,
);

export interface ApiClient {
  name: string;
  keyDigest: Buffer;
}

// W pamięci trzymamy tylko skróty kluczy. Dzięki stałej długości skrótu porównanie nie zdradza długości klucza. (DamianTchorzewski_72206)
export function hashApiKey(key: string): Buffer {
  return createHash('sha256').update(key).digest();
}

// Zamienia wartość zmiennej INTEGRATION_API_KEYS na listę klientów. Brak wartości oznacza brak dostępu dla wszystkich. (DamianTchorzewski_72206)
export function parseApiKeys(raw: string | undefined): ApiClient[] {
  if (raw === undefined || raw.trim() === '') {
    return [];
  }

  const clients = raw.split(',').map((entry) => {
    const separator = entry.indexOf(':');

    return {
      name: entry.slice(0, separator).trim(),
      keyDigest: hashApiKey(entry.slice(separator + 1).trim()),
    };
  });

  // Duplikat nazwy lub klucza uniemożliwiłby rozpoznanie zespołu, więc aplikacja nie powinna wystartować. (DamianTchorzewski_72206)
  const names = new Set(clients.map((client) => client.name));
  const digests = new Set(
    clients.map((client) => client.keyDigest.toString('hex')),
  );
  if (names.size !== clients.length) {
    throw new Error('INTEGRATION_API_KEYS contains a duplicated client name.');
  }
  if (digests.size !== clients.length) {
    throw new Error('INTEGRATION_API_KEYS contains a duplicated key.');
  }

  return clients;
}
