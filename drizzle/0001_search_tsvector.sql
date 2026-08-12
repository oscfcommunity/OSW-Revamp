-- Full-text search lives in Postgres itself: no extra service, no index-sync
-- consistency problem. The tsvector is a STORED generated column so it can never
-- drift from the text it indexes.

ALTER TABLE "search_document"
  ADD COLUMN "tsv" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce("title", '')), 'A')
   || setweight(to_tsvector('english', coalesce("tags",  '')), 'B')
   || setweight(to_tsvector('english', coalesce("body",  '')), 'C')
  ) STORED;
--> statement-breakpoint
CREATE INDEX "search_document_tsv_idx" ON "search_document" USING GIN ("tsv");
