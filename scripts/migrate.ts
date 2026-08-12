import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const MIGRATIONS_FOLDER = './drizzle';

const run = async (): Promise<void> => {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    const pool = new Pool({ connectionString });
    const db = drizzlePg({ client: pool });
    await migratePg(db, { migrationsFolder: MIGRATIONS_FOLDER });
    await pool.end();
    console.log('Migrations applied to Postgres.');
    return;
  }

  const dataDir = process.env.PGLITE_DATA_DIR ?? './.pglite';
  const client = new PGlite(dataDir);
  const db = drizzlePglite({ client });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  await client.close();
  console.log(`Migrations applied to PGlite at ${dataDir}.`);
};

run().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
