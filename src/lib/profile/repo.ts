import { and, desc, eq, inArray } from 'drizzle-orm';

import type { Database } from '../../db';
import { user } from '../../db/schema/auth';
import { profile } from '../../db/schema/community';
import { forumCategory, forumPost, forumThread } from '../../db/schema/forum';

export interface PublicProfile {
  userId: string;
  username: string;
  name: string;
  image: string | null;
  role: string;
  reputation: number;
  createdAt: Date;
  bio: string | null;
  location: string | null;
  pronouns: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  skills: string[];
  openToWork: boolean;
  isPublic: boolean;
}

export const getPublicProfile = async (
  db: Database,
  username: string,
): Promise<PublicProfile | undefined> => {
  const [row] = await db
    .select({
      userId: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      role: user.role,
      reputation: user.reputation,
      createdAt: user.createdAt,
      bio: profile.bio,
      location: profile.location,
      pronouns: profile.pronouns,
      websiteUrl: profile.websiteUrl,
      githubUrl: profile.githubUrl,
      twitterUrl: profile.twitterUrl,
      linkedinUrl: profile.linkedinUrl,
      skills: profile.skills,
      openToWork: profile.openToWork,
      isPublic: profile.isPublic,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(user.username, username.toLowerCase()))
    .limit(1);

  if (!row?.username) {
    return undefined;
  }

  return {
    ...row,
    username: row.username,
    skills: row.skills ?? [],
    // A member who has never opened their settings has no profile row at all.
    // Treat that as public: they have written nothing private to hide.
    isPublic: row.isPublic ?? true,
    openToWork: row.openToWork ?? false,
  };
};

/** Threads a member started, most recent first. */
export const listThreadsByAuthor = async (db: Database, userId: string, limit = 10) =>
  db
    .select({
      title: forumThread.title,
      slug: forumThread.slug,
      categorySlug: forumCategory.slug,
      categoryName: forumCategory.name,
      replyCount: forumThread.replyCount,
      createdAt: forumThread.createdAt,
    })
    .from(forumThread)
    .innerJoin(forumCategory, eq(forumCategory.id, forumThread.categoryId))
    .where(and(eq(forumThread.authorId, userId), eq(forumThread.status, 'visible')))
    .orderBy(desc(forumThread.createdAt))
    .limit(limit);

/** Replies a member wrote, excluding the opening posts already listed as threads. */
export const listRepliesByAuthor = async (db: Database, userId: string, limit = 10) =>
  db
    .select({
      postId: forumPost.id,
      createdAt: forumPost.createdAt,
      threadTitle: forumThread.title,
      threadSlug: forumThread.slug,
      categorySlug: forumCategory.slug,
    })
    .from(forumPost)
    .innerJoin(forumThread, eq(forumThread.id, forumPost.threadId))
    .innerJoin(forumCategory, eq(forumCategory.id, forumThread.categoryId))
    .where(
      and(
        eq(forumPost.authorId, userId),
        eq(forumPost.isFirstPost, false),
        eq(forumPost.status, 'visible'),
        eq(forumThread.status, 'visible'),
      ),
    )
    .orderBy(desc(forumPost.createdAt))
    .limit(limit);

/**
 * Usernames for a set of user ids, so lists of posts can link to profiles
 * without a query per author.
 */
export const usernamesFor = async (
  db: Database,
  userIds: readonly string[],
): Promise<Map<string, string>> => {
  const ids = [...new Set(userIds)].filter((id) => id.length > 0);
  if (ids.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({ id: user.id, username: user.username })
    .from(user)
    .where(inArray(user.id, ids));

  return new Map(rows.filter((row) => row.username !== null).map((row) => [row.id, row.username!]));
};
