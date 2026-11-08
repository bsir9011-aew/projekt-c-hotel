import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Odwzorowuje aliasy ścieżek zdefiniowane w tsconfig.json. Wymaga Vite 8. (DamianTchorzewski_72206)
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
