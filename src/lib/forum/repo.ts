import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';

import { db as defaultDb, type Database } from '../../db';
import { user } from '../../db/schema/auth';
import { forumCategory, forumPost, forumThread, forumVote } from '../../db/schema/forum';

export const THREADS_PER_PAGE = 20;
export const POSTS_PER_PAGE = 25;

export const DEFAULT_CATEGORIES = [
  {
    slug: 'announcements',
    name: 'Announcements',
    description: 'News from the Open Source Weekend team.',
    position: 0,
    minRoleToPost: 'moderator' as const,
  },
  {
    slug: 'general',
    name: 'General',
    description: 'Anything about open source, the community and the meetups.',
    position: 1,
    minRoleToPost: 'user' as const,
  },
  {
    slug: 'help',
    name: 'Help & Questions',
    description: 'Stuck on something? Ask here.',
    position: 2,
    minRoleToPost: 'user' as const,
  },
  {
    slug: 'projects',
    name: 'Show & Tell',
    description: 'Share what you are building.',
    position: 3,
    minRoleToPost: 'user' as const,
  },
  {
    slug: 'jobs-talk',
    name: 'Careers',
    description: 'Hiring, job hunting and career questions.',
    position: 4,
    minRoleToPost: 'user' as const,
  },
] as const;

/** Idempotent: the forum is unusable with no categories, so they are seeded on demand. */
export const ensureCategories = async (db: Database = defaultDb): Promise<void> => {
  await db
    .insert(forumCategory)
    .values([...DEFAULT_CATEGORIES])
    .onConflictDoNothing({
      target: forumCategory.slug,
    });
};

export const listCategories = async (db: Database = defaultDb) => {
  const rows = await db
    .select({
      id: forumCategory.id,
      slug: forumCategory.slug,
      name: forumCategory.name,
      description: forumCategory.description,
      isLocked: forumCategory.isLocked,
      minRoleToPost: forumCategory.minRoleToPost,
      threadCount: count(forumThread.id),
    })
    .from(forumCategory)
    .leftJoin(
      forumThread,
      and(eq(forumThread.categoryId, forumCategory.id), eq(forumThread.status, 'visible')),
    )
    .groupBy(forumCategory.id)
    .orderBy(asc(forumCategory.position));

  return rows;
};

export const getCategory = async (db: Database, slug: string) => {
  const [row] = await db.select().from(forumCategory).where(eq(forumCategory.slug, slug)).limit(1);
  return row;
};

const threadListSelect = {
  id: forumThread.id,
  slug: forumThread.slug,
  title: forumThread.title,
  isPinned: forumThread.isPinned,
  isLocked: forumThread.isLocked,
  replyCount: forumThread.replyCount,
  voteScore: forumThread.voteScore,
  viewCount: forumThread.viewCount,
  lastPostAt: forumThread.lastPostAt,
  createdAt: forumThread.createdAt,
  categorySlug: forumCategory.slug,
  categoryName: forumCategory.name,
  authorName: user.name,
  authorImage: user.image,
} as const;

export const listThreads = async (
  db: Database,
  options: { categoryId?: number; page?: number; includeHidden?: boolean } = {},
) => {
  const page = Math.max(1, options.page ?? 1);
  const conditions = [
    options.includeHidden ? undefined : eq(forumThread.status, 'visible'),
    options.categoryId === undefined ? undefined : eq(forumThread.categoryId, options.categoryId),
  ].filter((condition) => condition !== undefined);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [total]] = await Promise.all([
    db
      .select(threadListSelect)
      .from(forumThread)
      .innerJoin(forumCategory, eq(forumCategory.id, forumThread.categoryId))
      .leftJoin(user, eq(user.id, forumThread.authorId))
      .where(where)
      // Matches forum_thread_list_idx: pinned first, then most recent activity.
      .orderBy(desc(forumThread.isPinned), desc(forumThread.lastPostAt))
      .limit(THREADS_PER_PAGE)
      .offset((page - 1) * THREADS_PER_PAGE),
    db.select({ value: count() }).from(forumThread).where(where),
  ]);

  const totalCount = total?.value ?? 0;

  return {
    threads: rows,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / THREADS_PER_PAGE)),
    totalCount,
  };
};

export const getThread = async (db: Database, categorySlug: string, threadSlugValue: string) => {
  const [row] = await db
    .select({
      ...threadListSelect,
      categoryId: forumThread.categoryId,
      status: forumThread.status,
      authorId: forumThread.authorId,
    })
    .from(forumThread)
    .innerJoin(forumCategory, eq(forumCategory.id, forumThread.categoryId))
    .leftJoin(user, eq(user.id, forumThread.authorId))
    .where(and(eq(forumCategory.slug, categorySlug), eq(forumThread.slug, threadSlugValue)))
    .limit(1);

  return row;
};

export const listPosts = async (
  db: Database,
  threadId: string,
  options: { page?: number; viewerId?: string; includeHidden?: boolean } = {},
) => {
  const page = Math.max(1, options.page ?? 1);
  const statusCondition = options.includeHidden
    ? undefined
    : inArray(forumPost.status, ['visible', 'pending']);
  const where = statusCondition
    ? and(eq(forumPost.threadId, threadId), statusCondition)
    : eq(forumPost.threadId, threadId);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: forumPost.id,
        bodyHtml: forumPost.bodyHtml,
        bodyMd: forumPost.bodyMd,
        voteScore: forumPost.voteScore,
        status: forumPost.status,
        isFirstPost: forumPost.isFirstPost,
        createdAt: forumPost.createdAt,
        editedAt: forumPost.editedAt,
        authorId: forumPost.authorId,
        authorName: user.name,
        authorImage: user.image,
        authorRole: user.role,
        authorReputation: user.reputation,
      })
      .from(forumPost)
      .leftJoin(user, eq(user.id, forumPost.authorId))
      .where(where)
      .orderBy(asc(forumPost.createdAt))
      .limit(POSTS_PER_PAGE)
      .offset((page - 1) * POSTS_PER_PAGE),
    db.select({ value: count() }).from(forumPost).where(where),
  ]);

  const votes = options.viewerId
    ? await db
        .select({ postId: forumVote.postId, value: forumVote.value })
        .from(forumVote)
        .where(
          and(
            eq(forumVote.userId, options.viewerId),
            inArray(
              forumVote.postId,
              rows.map((row) => row.id),
            ),
          ),
        )
    : [];

  const voteByPost = new Map(votes.map((vote) => [vote.postId, vote.value]));
  const totalCount = total?.value ?? 0;

  return {
    posts: rows.map((row) => ({ ...row, viewerVote: voteByPost.get(row.id) ?? 0 })),
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / POSTS_PER_PAGE)),
    totalCount,
  };
};

export const incrementViewCount = async (db: Database, threadId: string): Promise<void> => {
  await db
    .update(forumThread)
    .set({ viewCount: sql`${forumThread.viewCount} + 1` })
    .where(eq(forumThread.id, threadId));
};
