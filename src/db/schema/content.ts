import { index, jsonb, pgEnum, pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { user } from './auth';

/**
 * Events and jobs themselves live in the Strapi CMS, not here. What stays in the
 * application database is the material Strapi does not own: the moderation queue
 * for community submissions, and the audit trail of who changed what.
 */

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
    /** The Strapi documentId created when the submission was approved. */
    resultDocumentId: text('result_document_id'),
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
