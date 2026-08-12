import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { tag } from './community';

// --- Events ------------------------------------------------------------------

export const eventType = pgEnum('event_type', ['Meetup', 'Workshop', 'Conference', 'Hackathon']);
export const eventStatus = pgEnum('event_status', ['draft', 'published', 'cancelled']);
export const attendanceMode = pgEnum('attendance_mode', ['In-person', 'Hybrid', 'Online']);
export const cfpStatus = pgEnum('cfp_status', ['none', 'Open', 'Closed']);

export const event = pgTable(
  'event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }),
    link: text('link'),
    location: text('location'),
    venue: text('venue'),
    venueName: text('venue_name'),
    venueMap: text('venue_map'),
    type: eventType('type').notNull().default('Meetup'),
    attendanceMode: attendanceMode('attendance_mode'),
    description: text('description'),
    longDescription: text('long_description'),
    community: text('community'),
    cfpStatus: cfpStatus('cfp_status').notNull().default('none'),
    cfpEndDate: timestamp('cfp_end_date', { withTimezone: true }),
    capacity: integer('capacity'),
    featured: boolean('featured').notNull().default(false),
    status: eventStatus('status').notNull().default('published'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('event_status_start_idx').on(table.status, table.startDate),
    index('event_featured_idx').on(table.featured, table.startDate),
  ],
);

export const eventImage = pgTable(
  'event_image',
  {
    id: serial('id').primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    position: integer('position').notNull().default(0),
  },
  (table) => [index('event_image_event_idx').on(table.eventId, table.position)],
);

export const eventSpeaker = pgTable(
  'event_speaker',
  {
    id: serial('id').primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    role: text('role'),
    company: text('company'),
    avatar: text('avatar'),
    position: integer('position').notNull().default(0),
  },
  (table) => [index('event_speaker_event_idx').on(table.eventId, table.position)],
);

export const eventAgendaItem = pgTable(
  'event_agenda_item',
  {
    id: serial('id').primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    time: text('time').notNull(),
    activity: text('activity').notNull(),
    position: integer('position').notNull().default(0),
  },
  (table) => [index('event_agenda_event_idx').on(table.eventId, table.position)],
);

export const eventTag = pgTable(
  'event_tag',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.tagId] })],
);

export const rsvpStatus = pgEnum('rsvp_status', ['going', 'waitlist', 'cancelled']);

export const eventRsvp = pgTable(
  'event_rsvp',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: rsvpStatus('status').notNull().default('going'),
    checkInCode: text('check_in_code').notNull(),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('event_rsvp_event_status_idx').on(table.eventId, table.status),
    index('event_rsvp_user_idx').on(table.userId),
  ],
);

// --- Jobs --------------------------------------------------------------------

export const jobStatus = pgEnum('job_status', ['open', 'closed']);

export const job = pgTable(
  'job',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    companyWebsite: text('company_website'),
    applyLink: text('apply_link').notNull(),
    experience: text('experience'),
    jobType: text('job_type'),
    jobMode: text('job_mode'),
    location: text('location'),
    openings: text('openings').notNull().default('1'),
    descriptionMd: text('description_md').notNull().default(''),
    aboutCompany: text('about_company'),
    featured: boolean('featured').notNull().default(false),
    status: jobStatus('status').notNull().default('open'),
    postedOn: timestamp('posted_on', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    postedBy: text('posted_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('job_status_posted_idx').on(table.status, table.postedOn),
    index('job_featured_idx').on(table.featured),
  ],
);

export const jobSkill = pgTable(
  'job_skill',
  {
    jobId: uuid('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.jobId, table.tagId] })],
);

// --- Submissions & moderation ------------------------------------------------

export const submissionKind = pgEnum('submission_kind', ['event', 'job', 'talk']);
export const submissionStatus = pgEnum('submission_status', [
  'pending',
  'approved',
  'rejected',
  'needs_info',
]);

export const submission = pgTable(
  'submission',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: submissionKind('kind').notNull(),
    payload: jsonb('payload').notNull(),
    status: submissionStatus('status').notNull().default('pending'),
    submittedBy: text('submitted_by').references(() => user.id, { onDelete: 'set null' }),
    submitterEmail: text('submitter_email').notNull(),
    submitterName: text('submitter_name'),
    reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    resultEntityId: uuid('result_entity_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('submission_status_idx').on(table.status, table.createdAt)],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_log_entity_idx').on(table.entityType, table.entityId),
    index('audit_log_actor_idx').on(table.actorId, table.createdAt),
  ],
);

// --- Blog & newsletter -------------------------------------------------------

export const blogStatus = pgEnum('blog_status', ['draft', 'published']);

export const blogPost = pgTable(
  'blog_post',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    bodyMd: text('body_md').notNull().default(''),
    bodyHtml: text('body_html').notNull().default(''),
    coverImage: text('cover_image'),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    status: blogStatus('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    readingMinutes: integer('reading_minutes').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('blog_post_status_published_idx').on(table.status, table.publishedAt)],
);

export const blogPostTag = pgTable(
  'blog_post_tag',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => blogPost.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tagId] })],
);

export const subscriberStatus = pgEnum('subscriber_status', [
  'pending',
  'confirmed',
  'unsubscribed',
]);

export const newsletterSubscriber = pgTable('newsletter_subscriber', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  status: subscriberStatus('status').notNull().default('pending'),
  confirmToken: text('confirm_token').notNull(),
  unsubToken: text('unsub_token').notNull().unique(),
  source: text('source'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
