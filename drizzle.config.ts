import { defineConfig } from 'drizzle-kit';

// Used for `drizzle-kit generate` only, which needs no database connection.
// Migrations are applied by scripts/migrate.ts, which picks the driver that
// matches the environment (PGlite locally, node-postgres in production).
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/osw',
  },
});
