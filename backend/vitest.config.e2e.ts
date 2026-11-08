import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Testy e2e używają atrapy bazy, ale konfiguracja aplikacji wymaga adresu połączenia. (DamianTchorzewski_72206)
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      FRONTEND_URL: 'http://localhost:5173',
    },
  },
});
