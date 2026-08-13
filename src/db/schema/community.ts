import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

export const tagKind = pgEnum('tag_kind', ['tech', 'topic', 'skill']);

export const tag = pgTable('tag', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  kind: tagKind('kind').notNull().default('topic'),
  usageCount: integer('usage_count').notNull().default(0),
});

export const profile = pgTable('profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  location: text('location'),
  pronouns: text('pronouns'),
  websiteUrl: text('website_url'),
  githubUrl: text('github_url'),
  twitterUrl: text('twitter_url'),
  linkedinUrl: text('linkedin_url'),
  skills: text('skills').array().notNull().default([]),
  isPublic: boolean('is_public').notNull().default(true),
  openToWork: boolean('open_to_work').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const badgeTier = pgEnum('badge_tier', ['bronze', 'silver', 'gold']);

export const badge = pgTable('badge', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  tier: badgeTier('tier').notNull().default('bronze'),
});

export const userBadge = pgTable(
  'user_badge',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    badgeId: integer('badge_id')
      .notNull()
      .references(() => badge.id, { onDelete: 'cascade' }),
    awardedAt: timestamp('awarded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.badgeId] })],
);

export const reputationReason = pgEnum('reputation_reason', [
  'post_upvote',
  'post_downvote',
  'thread_created',
  'answer_accepted',
  'event_checkin',
  'submission_approved',
  'moderation_penalty',
]);

/**
 * Append-only ledger. `user.reputation` is the materialised sum, so a deleted
 * post can be reversed by appending a compensating row rather than guessing.
 */
export const reputationEvent = pgTable(
  'reputation_event',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: reputationReason('reason').notNull(),
    sourceType: text('source_type'),
    sourceId: text('source_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('reputation_event_user_idx').on(table.userId, table.createdAt)],
);

export const rateLimit = pgTable(
  'rate_limit',
  {
    bucketKey: text('bucket_key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.bucketKey, table.windowStart] })],
);
