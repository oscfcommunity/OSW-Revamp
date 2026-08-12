/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Tests never talk to the real sheets; fetch is stubbed. These only need to be
    // present so the astro:env schema resolves.
    env: {
      GOOGLE_EVENTS_SHEET_URL: 'https://sheets.test/events.csv',
      GOOGLE_JOBS_SHEET_URL: 'https://sheets.test/jobs.csv',
      // Pinned so the sheet-backend tests keep testing the sheet backend no matter
      // what the developer's own .env is currently set to.
      CONTENT_SOURCE: 'sheet',
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['**/*.test.ts'],
    },
  },
});
