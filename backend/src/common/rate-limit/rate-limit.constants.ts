// Okno czasowe limitów żądań, w milisekundach. (DamianTchorzewski_72206)
export const RATE_LIMIT_WINDOW_MS = 60_000;

// Ogólny limit na adres IP dla każdego endpointu osobno. Chroni przed przypadkowym zalaniem API. (DamianTchorzewski_72206)
export const DEFAULT_RATE_LIMIT = 120;

// Anulacja jest zabezpieczona tylko kodem i e-mailem, więc zgadywanie kodów musi być utrudnione. (DamianTchorzewski_72206)
export const CANCEL_RATE_LIMIT = 5;

// Endpointy zespołów zewnętrznych: limit liczony przed sprawdzeniem klucza, aby chronił także przed zgadywaniem kluczy. (DamianTchorzewski_72206)
export const INTEGRATION_RATE_LIMIT = 60;
