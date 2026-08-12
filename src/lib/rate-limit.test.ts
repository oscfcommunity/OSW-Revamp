import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase, type TestDatabase } from '../../tests/helpers/db';
import { consumeRateLimit } from './rate-limit';

describe('consumeRateLimit', () => {
  let db: TestDatabase;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDatabase());
  });

  afterEach(async () => {
    await close();
  });

  const now = new Date('2026-08-12T12:00:00Z');

  it('allows requests up to the limit', async () => {
    const options = { key: 'thread:user-1', max: 3, windowSeconds: 3600, now };

    await expect(consumeRateLimit(db, options)).resolves.toMatchObject({ allowed: true });
    await expect(consumeRateLimit(db, options)).resolves.toMatchObject({ allowed: true });
    await expect(consumeRateLimit(db, options)).resolves.toMatchObject({ allowed: true });
  });

  it('refuses the request that exceeds the limit', async () => {
    const options = { key: 'thread:user-1', max: 2, windowSeconds: 3600, now };

    await consumeRateLimit(db, options);
    await consumeRateLimit(db, options);

    await expect(consumeRateLimit(db, options)).resolves.toMatchObject({ allowed: false });
  });

  it('counts each key separately', async () => {
    const base = { max: 1, windowSeconds: 3600, now };

    await consumeRateLimit(db, { ...base, key: 'thread:user-1' });

    await expect(consumeRateLimit(db, { ...base, key: 'thread:user-2' })).resolves.toMatchObject({
      allowed: true,
    });
  });

  it('starts a fresh count in the next window', async () => {
    const options = { key: 'thread:user-1', max: 1, windowSeconds: 60, now };

    await consumeRateLimit(db, options);
    await expect(consumeRateLimit(db, options)).resolves.toMatchObject({ allowed: false });

    const later = new Date(now.getTime() + 61_000);
    await expect(consumeRateLimit(db, { ...options, now: later })).resolves.toMatchObject({
      allowed: true,
    });
  });

  it('reports how long to wait when the limit is hit', async () => {
    const options = { key: 'thread:user-1', max: 1, windowSeconds: 600, now };

    await consumeRateLimit(db, options);
    const result = await consumeRateLimit(db, options);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(600);
  });
});
