import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { createTestDatabase, type TestDatabase } from '../../tests/helpers/db';
import { user } from '../db/schema/auth';
import { claimUsername } from './username-claim';

describe('claimUsername', () => {
  let db: TestDatabase;
  let close: () => Promise<void>;

  const addMember = async (id: string, name: string, email: string): Promise<void> => {
    await db.insert(user).values({ id, name, email });
  };

  const usernameOf = async (id: string): Promise<string | null> => {
    const [row] = await db.select({ username: user.username }).from(user).where(eq(user.id, id));
    return row?.username ?? null;
  };

  beforeEach(async () => {
    ({ db, close } = await createTestDatabase());
  });

  afterEach(async () => {
    await close();
  });

  it('assigns a username derived from the display name', async () => {
    await addMember('u1', 'Ashish Vaghela', 'ashish@osw.test');

    await claimUsername(db, { id: 'u1', name: 'Ashish Vaghela', email: 'ashish@osw.test' });

    await expect(usernameOf('u1')).resolves.toBe('ashish-vaghela');
  });

  it('adds a suffix when the obvious username is taken', async () => {
    await addMember('u1', 'Ada Lovelace', 'ada1@osw.test');
    await addMember('u2', 'Ada Lovelace', 'ada2@osw.test');

    await claimUsername(db, { id: 'u1', name: 'Ada Lovelace', email: 'ada1@osw.test' });
    await claimUsername(db, { id: 'u2', name: 'Ada Lovelace', email: 'ada2@osw.test' });

    expect(await usernameOf('u1')).toBe('ada-lovelace');
    expect(await usernameOf('u2')).toBe('ada-lovelace-2');
  });

  it('leaves an existing username alone', async () => {
    await addMember('u1', 'Ada Lovelace', 'ada@osw.test');
    await db.update(user).set({ username: 'chosen-name' }).where(eq(user.id, 'u1'));

    await claimUsername(db, { id: 'u1', name: 'Ada Lovelace', email: 'ada@osw.test' });

    await expect(usernameOf('u1')).resolves.toBe('chosen-name');
  });

  it('avoids a name that would collide with one of the site’s routes', async () => {
    await addMember('u1', 'Admin', 'admin@osw.test');

    await claimUsername(db, { id: 'u1', name: 'Admin', email: 'admin@osw.test' });

    const username = await usernameOf('u1');
    expect(username).not.toBe('admin');
    expect(username).toBeTruthy();
  });
});
