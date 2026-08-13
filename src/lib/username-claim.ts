import { and, eq, isNull } from 'drizzle-orm';

import type { Database } from '../db';
import { isUniqueViolation } from './db-errors';
import { user } from '../db/schema/auth';
import { suggestUsername, validateUsername } from './username';

const MAX_ATTEMPTS = 12;

export interface ClaimUsernameInput {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Gives a member a public address the first time they sign in, so every profile
 * is reachable without anyone having to visit their settings first.
 *
 * Availability is settled by the unique index rather than by checking first,
 * which would still race with another member claiming the same name.
 */
export const claimUsername = async (
  db: Database,
  member: ClaimUsernameInput,
): Promise<string | null> => {
  const base = suggestUsername(member.name ?? '', member.email);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const candidate =
      attempt === 1
        ? base
        : `${base.slice(0, 27)}-${attempt}`.replace(/-+/g, '-').replace(/^-|-$/g, '');

    const checked = validateUsername(candidate);
    if (!checked.ok) {
      // Reserved or malformed: skip to the suffixed form rather than giving up.
      continue;
    }

    try {
      const updated = await db
        .update(user)
        .set({ username: checked.username })
        // Only claims when the member still has none, so a name they chose
        // themselves is never overwritten.
        .where(and(eq(user.id, member.id), isNull(user.username)))
        .returning({ username: user.username });

      // No row updated means they already had one.
      return updated[0]?.username ?? null;
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue;
      }
      throw error;
    }
  }

  return null;
};
