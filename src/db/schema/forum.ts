import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { user, userRole } from './auth';
import { tag } from './community';

export const contentStatus = pgEnum('content_status', ['visible', 'pending', 'hidden', 'deleted']);

export const forumCategory = pgTable('forum_category', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  position: integer('position').notNull().default(0),
  isLocked: boolean('is_locked').notNull().default(false),
  minRoleToPost: userRole('min_role_to_post').notNull().default('user'),
});

export const forumThread = pgTable(
  'forum_thread',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => forumCategory.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    isPinned: boolean('is_pinned').notNull().default(false),
    isLocked: boolean('is_locked').notNull().default(false),
    status: contentStatus('status').notNull().default('visible'),
    // Denormalised counters, written in the same transaction as the post they
    // describe. Counting posts per thread on every list render does not scale.
    replyCount: integer('reply_count').notNull().default(0),
    voteScore: integer('vote_score').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    lastPostAt: timestamp('last_post_at', { withTimezone: true }).notNull().defaultNow(),
    lastPostBy: text('last_post_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('forum_thread_category_slug_unique').on(table.categoryId, table.slug),
    index('forum_thread_list_idx').on(table.categoryId, table.isPinned, table.lastPostAt),
    index('forum_thread_latest_idx').on(table.status, table.lastPostAt),
    index('forum_thread_author_idx').on(table.authorId, table.createdAt),
  ],
);

export const forumPost = pgTable(
  'forum_post',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => forumThread.id, { onDelete: 'cascade' }),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    parentPostId: uuid('parent_post_id'),
    bodyMd: text('body_md').notNull(),
    // Sanitized at write time, so rendering a thread costs no markdown work.
    bodyHtml: text('body_html').notNull(),
    voteScore: integer('vote_score').notNull().default(0),
    isAnswer: boolean('is_answer').notNull().default(false),
    isFirstPost: boolean('is_first_post').notNull().default(false),
    status: contentStatus('status').notNull().default('visible'),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    editedBy: text('edited_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('forum_post_thread_idx').on(table.threadId, table.createdAt),
    index('forum_post_author_idx').on(table.authorId, table.createdAt),
  ],
);

export const forumVote = pgTable(
  'forum_vote',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => forumPost.id, { onDelete: 'cascade' }),
    value: smallint('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.postId] })],
);

export const forumSubscription = pgTable(
  'forum_subscription',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => forumThread.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.threadId] })],
);

export const reportReason = pgEnum('report_reason', ['spam', 'abuse', 'offtopic', 'other']);
export const reportStatus = pgEnum('report_status', ['open', 'actioned', 'dismissed']);

export const forumReport = pgTable(
  'forum_report',
  {
    id: serial('id').primaryKey(),
    reporterId: text('reporter_id').references(() => user.id, { onDelete: 'set null' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => forumPost.id, { onDelete: 'cascade' }),
    reason: reportReason('reason').notNull(),
    detail: text('detail'),
    status: reportStatus('status').notNull().default('open'),
    handledBy: text('handled_by').references(() => user.id, { onDelete: 'set null' }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('forum_report_status_idx').on(table.status, table.createdAt)],
);

export const forumThreadTag = pgTable(
  'forum_thread_tag',
  {
    threadId: uuid('thread_id')
      .notNull()
      .references(() => forumThread.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.threadId, table.tagId] })],
);
