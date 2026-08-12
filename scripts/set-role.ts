import { eq } from 'drizzle-orm';

import { db } from '../src/db';
import { user } from '../src/db/schema/auth';

const ROLES = ['user', 'moderator', 'admin'] as const;
type Role = (typeof ROLES)[number];

const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value);

const run = async (): Promise<void> => {
  const [email, role] = process.argv.slice(2);

  if (!email || !role || !isRole(role)) {
    console.error('Usage: npx tsx scripts/set-role.ts <email> <user|moderator|admin>');
    process.exit(1);
  }

  const [updated] = await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.email, email))
    .returning({ email: user.email, role: user.role });

  if (!updated) {
    console.error(`No user with email ${email}. Sign in once first.`);
    process.exit(1);
  }

  console.log(`${updated.email} is now ${updated.role}.`);
  process.exit(0);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
