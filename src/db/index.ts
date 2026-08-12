import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

import * as schema from './schema';

/**
 * Production runs Postgres over the network (DATABASE_URL). Local development and
 * tests run PGlite — the same Postgres engine compiled to WASM — so contributors
 * need no database daemon. Both speak the same SQL and share one set of migrations.
 */
// The shared base of both drivers. A union of the two concrete types would
// collapse Drizzle's method overloads and make every .set()/.values() call fail
// to typecheck, so the common supertype is what callers work against.
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const createPgDatabase = (connectionString: string) =>
  drizzlePg({
    client: new Pool({ connectionString, max: 10 }),
    schema,
    casing: 'snake_case',
  });

const createPgliteDatabase = (dataDir: string) =>
  drizzlePglite({
    client: new PGlite(dataDir),
    schema,
    casing: 'snake_case',
  });

export const PGLITE_DATA_DIR = process.env.PGLITE_DATA_DIR ?? './.pglite';

const globalForDb = globalThis as typeof globalThis & { __oswDb?: Database };

const create = (): Database => {
  const connectionString = process.env.DATABASE_URL;
  return connectionString
    ? createPgDatabase(connectionString)
    : createPgliteDatabase(PGLITE_DATA_DIR);
};

/**
 * Singleton on globalThis: the dev server reloads modules on every edit, and a
 * fresh pool (or PGlite instance) per reload exhausts connections within minutes.
 */
export const db: Database = globalForDb.__oswDb ?? create();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__oswDb = db;
}

export { schema };
