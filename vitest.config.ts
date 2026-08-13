/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Deliberately no `env` here. astro:env resolves when the Astro config is
    // loaded, so values set at this point do not reach it — a local .env would
    // silently decide whether tests pass. Tests that need those values mock
    // 'astro:env/server' instead; everything else tests pure functions.
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['**/*.test.ts'],
    },
  },
});
