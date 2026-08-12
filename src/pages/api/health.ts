import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';

import { db } from '../../db';

export const prerender = false;

/** Used by the container healthcheck: a running process with a dead database is not healthy. */
export const GET: APIRoute = async () => {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('Health check failed:', error);
    return Response.json({ status: 'error' }, { status: 503 });
  }
};
