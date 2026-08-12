import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

/**
 * One denormalised index for every searchable entity. The tsvector column is a
 * generated column added by a hand-written migration (drizzle-kit does not model
 * generated tsvector columns), which guarantees the index can never drift from
 * the text it indexes.
 */
export const searchDocument = pgTable(
  'search_document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    url: text('url').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    tags: text('tags').notNull().default(''),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    unique('search_document_entity_unique').on(table.entityType, table.entityId),
    index('search_document_type_idx').on(table.entityType),
  ],
);
