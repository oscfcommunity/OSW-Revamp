import { and, eq, sql } from 'drizzle-orm';

import type { Database } from '../../db';
import { forumPost, forumSubscription, forumThread, forumVote } from '../../db/schema/forum';
import type { contentStatus } from '../../db/schema/forum';
import { renderUserMarkdown } from '../markdown';
import { threadSlug } from './slug';

type ContentStatus = (typeof contentStatus.enumValues)[number];

export class ForumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForumError';
  }
}

export interface CreateThreadInput {
  categoryId: number;
  authorId: string;
  title: string;
  body: string;
}

export const createThread = async (
  db: Database,
  input: CreateThreadInput,
): Promise<{ id: string; slug: string }> => {
  const bodyHtml = await renderUserMarkdown(input.body);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [thread] = await tx
      .insert(forumThread)
      .values({
        categoryId: input.categoryId,
        // Placeholder: the slug needs the generated id, so it is set immediately below.
        slug: `pending-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        title: input.title,
        authorId: input.authorId,
        lastPostAt: now,
        lastPostBy: input.authorId,
      })
      .returning({ id: forumThread.id });

    const threadId = thread!.id;
    const slug = threadSlug(input.title, threadId);

    await tx.update(forumThread).set({ slug }).where(eq(forumThread.id, threadId));

    await tx.insert(forumPost).values({
      threadId,
      authorId: input.authorId,
      bodyMd: input.body,
      bodyHtml,
      isFirstPost: true,
    });

    // The author follows their own thread, so replies reach them.
    await tx
      .insert(forumSubscription)
      .values({ userId: input.authorId, threadId })
      .onConflictDoNothing();

    return { id: threadId, slug };
  });
};

export interface CreateReplyInput {
  threadId: string;
  authorId: string;
  body: string;
  parentPostId?: string;
}

export const createReply = async (
  db: Database,
  input: CreateReplyInput,
): Promise<{ id: string }> => {
  const bodyHtml = await renderUserMarkdown(input.body);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [thread] = await tx
      .select({ isLocked: forumThread.isLocked, status: forumThread.status })
      .from(forumThread)
      .where(eq(forumThread.id, input.threadId))
      .limit(1);

    if (!thread) {
      throw new ForumError('That thread no longer exists.');
    }
    if (thread.isLocked) {
      throw new ForumError('This thread is locked.');
    }
    if (thread.status !== 'visible') {
      throw new ForumError('This thread is no longer available.');
    }

    const [post] = await tx
      .insert(forumPost)
      .values({
        threadId: input.threadId,
        authorId: input.authorId,
        parentPostId: input.parentPostId ?? null,
        bodyMd: input.body,
        bodyHtml,
      })
      .returning({ id: forumPost.id });

    // Counters move in the same transaction as the post they describe.
    await tx
      .update(forumThread)
      .set({
        replyCount: sql`${forumThread.replyCount} + 1`,
        lastPostAt: now,
        lastPostBy: input.authorId,
      })
      .where(eq(forumThread.id, input.threadId));

    await tx
      .insert(forumSubscription)
      .values({ userId: input.authorId, threadId: input.threadId })
      .onConflictDoNothing();

    return { id: post!.id };
  });
};

export interface CastVoteInput {
  postId: string;
  userId: string;
  value: 1 | -1;
}

export const castVote = async (
  db: Database,
  input: CastVoteInput,
): Promise<{ score: number; viewerVote: number }> =>
  db.transaction(async (tx) => {
    const [post] = await tx
      .select({ authorId: forumPost.authorId })
      .from(forumPost)
      .where(eq(forumPost.id, input.postId))
      .limit(1);

    if (!post) {
      throw new ForumError('That post no longer exists.');
    }
    if (post.authorId === input.userId) {
      throw new ForumError('You cannot vote on your own post.');
    }

    const [existing] = await tx
      .select({ value: forumVote.value })
      .from(forumVote)
      .where(and(eq(forumVote.postId, input.postId), eq(forumVote.userId, input.userId)))
      .limit(1);

    let delta: number = input.value;
    let viewerVote: number = input.value;

    if (existing) {
      if (existing.value === input.value) {
        // Voting the same way twice takes the vote back.
        await tx
          .delete(forumVote)
          .where(and(eq(forumVote.postId, input.postId), eq(forumVote.userId, input.userId)));
        delta = -existing.value;
        viewerVote = 0;
      } else {
        await tx
          .update(forumVote)
          .set({ value: input.value })
          .where(and(eq(forumVote.postId, input.postId), eq(forumVote.userId, input.userId)));
        delta = input.value - existing.value;
      }
    } else {
      await tx
        .insert(forumVote)
        .values({ postId: input.postId, userId: input.userId, value: input.value });
    }

    const [updated] = await tx
      .update(forumPost)
      .set({ voteScore: sql`${forumPost.voteScore} + ${delta}` })
      .where(eq(forumPost.id, input.postId))
      .returning({ score: forumPost.voteScore });

    return { score: updated?.score ?? 0, viewerVote };
  });

export interface SetPostStatusInput {
  postId: string;
  status: ContentStatus;
  actorId: string;
}

/**
 * Soft moderation only. Content is never destroyed, so a mistaken action is
 * reversible and an abuse case stays investigable.
 */
export const setPostStatus = async (db: Database, input: SetPostStatusInput): Promise<void> => {
  await db.transaction(async (tx) => {
    const [post] = await tx
      .select({
        threadId: forumPost.threadId,
        status: forumPost.status,
        isFirstPost: forumPost.isFirstPost,
      })
      .from(forumPost)
      .where(eq(forumPost.id, input.postId))
      .limit(1);

    if (!post) {
      throw new ForumError('That post no longer exists.');
    }

    await tx
      .update(forumPost)
      .set({ status: input.status, editedBy: input.actorId, editedAt: new Date() })
      .where(eq(forumPost.id, input.postId));

    const wasCounted = post.status === 'visible' || post.status === 'pending';
    const isCounted = input.status === 'visible' || input.status === 'pending';

    if (!post.isFirstPost && wasCounted !== isCounted) {
      await tx
        .update(forumThread)
        .set({ replyCount: sql`greatest(${forumThread.replyCount} + ${isCounted ? 1 : -1}, 0)` })
        .where(eq(forumThread.id, post.threadId));
    }

    // Hiding the opening post takes the whole thread out of the listings.
    if (post.isFirstPost) {
      await tx
        .update(forumThread)
        .set({ status: input.status === 'visible' ? 'visible' : input.status })
        .where(eq(forumThread.id, post.threadId));
    }
  });
};

export const setThreadFlags = async (
  db: Database,
  input: { threadId: string; isPinned?: boolean; isLocked?: boolean; status?: ContentStatus },
): Promise<void> => {
  await db
    .update(forumThread)
    .set({
      ...(input.isPinned === undefined ? {} : { isPinned: input.isPinned }),
      ...(input.isLocked === undefined ? {} : { isLocked: input.isLocked }),
      ...(input.status === undefined ? {} : { status: input.status }),
    })
    .where(eq(forumThread.id, input.threadId));
};
