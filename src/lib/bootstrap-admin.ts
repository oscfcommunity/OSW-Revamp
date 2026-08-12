import { eq } from 'drizzle-orm';

import { db } from '../db';
import { user } from '../db/schema/auth';
import type { Role } from './guards';

/**
 * Bootstraps the first admin. Without this there is no way to reach /admin: the
 * only way in would be to edit the database by hand, and with an embedded PGlite
 * database in development the app holds the only connection to it.
 */
export const shouldPromoteToAdmin = (
  email: string,
  currentRole: Role,
  adminEmails: string | undefined,
): boolean => {
  if (!email.trim() || currentRole === 'admin') {
    return false;
  }

  const allowed = (adminEmails ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return allowed.includes(email.trim().toLowerCase());
};

export const promoteToAdmin = async (userId: string): Promise<void> => {
  await db.update(user).set({ role: 'admin', updatedAt: new Date() }).where(eq(user.id, userId));
};
