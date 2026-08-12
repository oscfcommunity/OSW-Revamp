import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import type { Database } from '../../src/db';
import * as schema from '../../src/db/schema';

export type TestDatabase = Database;

/**
 * A throwaway in-memory Postgres with the real migrations applied, so tests run
 * against the actual schema rather than a hand-written approximation.
 */
export const createTestDatabase = async (): Promise<{
  db: TestDatabase;
  close: () => Promise<void>;
}> => {
  const client = new PGlite('memory://');
  const db = drizzle({ client, schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder: './drizzle' });

  return {
    db,
    close: () => client.close(),
  };
};
