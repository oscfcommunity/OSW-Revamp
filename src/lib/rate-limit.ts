import { sql } from 'drizzle-orm';

import type { Database } from '../db';
import { rateLimit } from '../db/schema/community';

export interface RateLimitOptions {
  key: string;
  max: number;
  windowSeconds: number;
  now?: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window counter held in Postgres rather than in process memory: an
 * in-memory limiter silently stops working the moment a second container starts,
 * and nobody notices until the spam arrives.
 */
export const consumeRateLimit = async (
  db: Database,
  { key, max, windowSeconds, now = new Date() }: RateLimitOptions,
): Promise<RateLimitResult> => {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

  const [row] = await db
    .insert(rateLimit)
    .values({ bucketKey: key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimit.bucketKey, rateLimit.windowStart],
      set: { count: sql`${rateLimit.count} + 1` },
    })
    .returning({ count: rateLimit.count });

  const count = row?.count ?? 1;
  const resetAt = windowStart.getTime() + windowMs;

  return {
    allowed: count <= max,
    count,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
};
