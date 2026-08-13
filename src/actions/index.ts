import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { eq } from 'drizzle-orm';

import { db } from '../db';
import { auditLog } from '../db/schema/content';
import { user } from '../db/schema/auth';
import { AuthorizationError, requireRole, type Viewer } from '../lib/guards';
import { forum } from './forum';

const asActionError = (error: unknown): never => {
  if (error instanceof AuthorizationError) {
    throw new ActionError({
      code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
      message: error.message,
    });
  }
  throw error;
};

/** Middleware decides routing; this is the check that actually protects a mutation. */
const admin = (viewer: Viewer | null): Viewer => {
  try {
    return requireRole(viewer, 'admin');
  } catch (error) {
    return asActionError(error);
  }
};

const moderator = (viewer: Viewer | null): Viewer => {
  try {
    return requireRole(viewer, 'moderator');
  } catch (error) {
    return asActionError(error);
  }
};

const record = async (
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  after?: unknown,
): Promise<void> => {
  await db.insert(auditLog).values({
    actorId,
    action,
    entityType,
    entityId,
    after: after === undefined ? null : (after as Record<string, unknown>),
  });
};

/**
 * Events and jobs are edited in Strapi, so there are no content mutations here.
 * What remains is membership: roles, suspensions and the forum.
 */
export const server = {
  forum,

  moderation: {
    setUserRole: defineAction({
      accept: 'form',
      input: z.object({
        userId: z.string().min(1),
        role: z.enum(['user', 'moderator', 'admin']),
      }),
      handler: async (input, context) => {
        const actor = admin(context.locals.viewer);

        if (input.userId === actor.id) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message: 'You cannot change your own role.',
          });
        }

        await db
          .update(user)
          .set({ role: input.role, updatedAt: new Date() })
          .where(eq(user.id, input.userId));
        await record(actor.id, 'user.role', 'user', input.userId, { role: input.role });
        return { role: input.role };
      },
    }),

    banUser: defineAction({
      accept: 'form',
      input: z.object({
        userId: z.string().min(1),
        days: z.coerce.number().int().min(0).max(3650),
        reason: z.preprocess(
          (value) => (value === null || value === '' ? undefined : value),
          z.string().trim().max(500).optional(),
        ),
      }),
      handler: async (input, context) => {
        const actor = moderator(context.locals.viewer);

        const bannedUntil =
          input.days > 0 ? new Date(Date.now() + input.days * 24 * 60 * 60 * 1000) : null;

        await db
          .update(user)
          .set({ bannedUntil, banReason: input.reason ?? null, updatedAt: new Date() })
          .where(eq(user.id, input.userId));
        await record(actor.id, bannedUntil ? 'user.ban' : 'user.unban', 'user', input.userId, {
          bannedUntil,
        });
        return { bannedUntil };
      },
    }),
  },
};
