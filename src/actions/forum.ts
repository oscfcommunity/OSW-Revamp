import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { eq } from 'drizzle-orm';

import { db } from '../db';
import { forumCategory, forumReport, forumThread } from '../db/schema/forum';
import { AuthorizationError, canModerate, hasRole, requireRole, type Viewer } from '../lib/guards';
import { consumeRateLimit } from '../lib/rate-limit';
import {
  castVote,
  createReply,
  createThread,
  ForumError,
  setPostStatus,
  setThreadFlags,
} from '../lib/forum/write';

const toActionError = (error: unknown): never => {
  if (error instanceof AuthorizationError) {
    throw new ActionError({
      code: error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
      message: error.message,
    });
  }
  if (error instanceof ForumError) {
    throw new ActionError({ code: 'BAD_REQUEST', message: error.message });
  }
  throw error;
};

const member = (viewer: Viewer | null): Viewer => {
  try {
    return requireRole(viewer, 'user');
  } catch (error) {
    return toActionError(error);
  }
};

const moderatorOnly = (viewer: Viewer | null): Viewer => {
  try {
    return requireRole(viewer, 'moderator');
  } catch (error) {
    return toActionError(error);
  }
};

/** Throws unless the caller is under the limit. Postgres-backed, so it survives restarts. */
const limit = async (key: string, max: number, windowSeconds: number): Promise<void> => {
  const result = await consumeRateLimit(db, { key, max, windowSeconds });
  if (!result.allowed) {
    throw new ActionError({
      code: 'TOO_MANY_REQUESTS',
      message: `You are posting too quickly. Try again in ${Math.ceil(result.retryAfterSeconds / 60)} minute(s).`,
    });
  }
};

export const forum = {
  createThread: defineAction({
    accept: 'form',
    input: z.object({
      categoryId: z.coerce.number().int().positive(),
      title: z.string().trim().min(8, 'Give the thread a clearer title').max(160),
      body: z.string().trim().min(20, 'Add a little more detail').max(20_000),
    }),
    handler: async (input, context) => {
      const viewer = member(context.locals.viewer);

      const [category] = await db
        .select()
        .from(forumCategory)
        .where(eq(forumCategory.id, input.categoryId))
        .limit(1);

      if (!category) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'That category does not exist.' });
      }
      if (category.isLocked && !canModerate(viewer)) {
        throw new ActionError({ code: 'FORBIDDEN', message: 'That category is locked.' });
      }
      if (!hasRole(viewer, category.minRoleToPost)) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: 'Only the team can start threads in this category.',
        });
      }

      await limit(`thread:${viewer.id}`, 5, 3600);

      try {
        const created = await createThread(db, {
          categoryId: category.id,
          authorId: viewer.id,
          title: input.title,
          body: input.body,
        });
        return { url: `/forum/c/${category.slug}/${created.slug}` };
      } catch (error) {
        return toActionError(error);
      }
    },
  }),

  reply: defineAction({
    accept: 'form',
    input: z.object({
      threadId: z.uuid(),
      redirectTo: z.string().startsWith('/').max(300),
      body: z.string().trim().min(2, 'Write a reply first').max(20_000),
    }),
    handler: async (input, context) => {
      const viewer = member(context.locals.viewer);
      await limit(`reply:${viewer.id}`, 30, 3600);

      try {
        await createReply(db, {
          threadId: input.threadId,
          authorId: viewer.id,
          body: input.body,
        });
        return { url: input.redirectTo };
      } catch (error) {
        return toActionError(error);
      }
    },
  }),

  vote: defineAction({
    input: z.object({
      postId: z.uuid(),
      value: z.union([z.literal(1), z.literal(-1)]),
    }),
    handler: async (input, context) => {
      const viewer = member(context.locals.viewer);
      await limit(`vote:${viewer.id}`, 200, 3600);

      try {
        return await castVote(db, { postId: input.postId, userId: viewer.id, value: input.value });
      } catch (error) {
        return toActionError(error);
      }
    },
  }),

  report: defineAction({
    accept: 'form',
    input: z.object({
      postId: z.uuid(),
      reason: z.enum(['spam', 'abuse', 'offtopic', 'other']),
      detail: z.preprocess(
        (value) => (value === null || value === '' ? undefined : value),
        z.string().trim().max(1000).optional(),
      ),
      redirectTo: z.string().startsWith('/').max(300),
    }),
    handler: async (input, context) => {
      const viewer = member(context.locals.viewer);
      await limit(`report:${viewer.id}`, 20, 3600);

      await db.insert(forumReport).values({
        reporterId: viewer.id,
        postId: input.postId,
        reason: input.reason,
        detail: input.detail ?? null,
      });

      return { url: input.redirectTo, reported: true };
    },
  }),

  moderatePost: defineAction({
    accept: 'form',
    input: z.object({
      postId: z.uuid(),
      status: z.enum(['visible', 'hidden', 'deleted']),
      redirectTo: z.string().startsWith('/').max(300),
    }),
    handler: async (input, context) => {
      const viewer = moderatorOnly(context.locals.viewer);
      try {
        await setPostStatus(db, {
          postId: input.postId,
          status: input.status,
          actorId: viewer.id,
        });
        return { url: input.redirectTo };
      } catch (error) {
        return toActionError(error);
      }
    },
  }),

  moderateThread: defineAction({
    accept: 'form',
    input: z.object({
      threadId: z.uuid(),
      pin: z.preprocess((value) => value === 'true', z.boolean()).optional(),
      lock: z.preprocess((value) => value === 'true', z.boolean()).optional(),
      redirectTo: z.string().startsWith('/').max(300),
    }),
    handler: async (input, context) => {
      moderatorOnly(context.locals.viewer);

      const [thread] = await db
        .select({ isPinned: forumThread.isPinned, isLocked: forumThread.isLocked })
        .from(forumThread)
        .where(eq(forumThread.id, input.threadId))
        .limit(1);

      if (!thread) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'That thread does not exist.' });
      }

      await setThreadFlags(db, {
        threadId: input.threadId,
        isPinned: input.pin === undefined ? undefined : input.pin,
        isLocked: input.lock === undefined ? undefined : input.lock,
      });

      return { url: input.redirectTo };
    },
  }),
};
