CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."badge_tier" AS ENUM('bronze', 'silver', 'gold');--> statement-breakpoint
CREATE TYPE "public"."reputation_reason" AS ENUM('post_upvote', 'post_downvote', 'thread_created', 'answer_accepted', 'event_checkin', 'submission_approved', 'moderation_penalty');--> statement-breakpoint
CREATE TYPE "public"."tag_kind" AS ENUM('tech', 'topic', 'skill');--> statement-breakpoint
CREATE TYPE "public"."blog_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."cfp_status" AS ENUM('none', 'Open', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('Meetup', 'Workshop', 'Conference', 'Hackathon');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('going', 'waitlist', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."submission_kind" AS ENUM('event', 'job', 'talk');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected', 'needs_info');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'confirmed', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('visible', 'pending', 'hidden', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'abuse', 'offtopic', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_provider_account_unique" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"reputation" integer DEFAULT 0 NOT NULL,
	"banned_until" timestamp with time zone,
	"ban_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badge" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"tier" "badge_tier" DEFAULT 'bronze' NOT NULL,
	CONSTRAINT "badge_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bio" text,
	"location" text,
	"pronouns" text,
	"website_url" text,
	"github_url" text,
	"twitter_url" text,
	"linkedin_url" text,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"open_to_work" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"bucket_key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_bucket_key_window_start_pk" PRIMARY KEY("bucket_key","window_start")
);
--> statement-breakpoint
CREATE TABLE "reputation_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" "reputation_reason" NOT NULL,
	"source_type" text,
	"source_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "tag_kind" DEFAULT 'topic' NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tag_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_badge" (
	"user_id" text NOT NULL,
	"badge_id" integer NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badge_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body_md" text DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"cover_image" text,
	"author_id" text,
	"status" "blog_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"reading_minutes" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_post_tag" (
	"post_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "blog_post_tag_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"link" text,
	"location" text,
	"venue" text,
	"venue_name" text,
	"venue_map" text,
	"type" "event_type" DEFAULT 'Meetup' NOT NULL,
	"description" text,
	"long_description" text,
	"community" text,
	"cfp_status" "cfp_status" DEFAULT 'none' NOT NULL,
	"cfp_end_date" timestamp with time zone,
	"capacity" integer,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "event_status" DEFAULT 'published' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_agenda_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"time" text NOT NULL,
	"activity" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_image" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rsvp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "rsvp_status" DEFAULT 'going' NOT NULL,
	"check_in_code" text NOT NULL,
	"checked_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_speaker" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"role" text,
	"company" text,
	"avatar" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_tag" (
	"event_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "event_tag_event_id_tag_id_pk" PRIMARY KEY("event_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"company_website" text,
	"apply_link" text NOT NULL,
	"experience" text,
	"job_type" text,
	"job_mode" text,
	"location" text,
	"openings" text DEFAULT '1' NOT NULL,
	"description_md" text DEFAULT '' NOT NULL,
	"about_company" text,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "job_status" DEFAULT 'open' NOT NULL,
	"posted_on" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"posted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "job_skill" (
	"job_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "job_skill_job_id_tag_id_pk" PRIMARY KEY("job_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriber" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"status" "subscriber_status" DEFAULT 'pending' NOT NULL,
	"confirm_token" text NOT NULL,
	"unsub_token" text NOT NULL,
	"source" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscriber_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_subscriber_unsub_token_unique" UNIQUE("unsub_token")
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "submission_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"submitted_by" text,
	"submitter_email" text NOT NULL,
	"submitter_name" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"result_entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"min_role_to_post" "user_role" DEFAULT 'user' NOT NULL,
	CONSTRAINT "forum_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "forum_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" text,
	"parent_post_id" uuid,
	"body_md" text NOT NULL,
	"body_html" text NOT NULL,
	"vote_score" integer DEFAULT 0 NOT NULL,
	"is_answer" boolean DEFAULT false NOT NULL,
	"is_first_post" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'visible' NOT NULL,
	"edited_at" timestamp with time zone,
	"edited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_report" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" text,
	"post_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"detail" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"handled_by" text,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_subscription" (
	"user_id" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_subscription_user_id_thread_id_pk" PRIMARY KEY("user_id","thread_id")
);
--> statement-breakpoint
CREATE TABLE "forum_thread" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"author_id" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'visible' NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"vote_score" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_post_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_post_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_thread_category_slug_unique" UNIQUE("category_id","slug")
);
--> statement-breakpoint
CREATE TABLE "forum_thread_tag" (
	"thread_id" uuid NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "forum_thread_tag_thread_id_tag_id_pk" PRIMARY KEY("thread_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "forum_vote" (
	"user_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_vote_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "search_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"tags" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "search_document_entity_unique" UNIQUE("entity_type","entity_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reputation_event" ADD CONSTRAINT "reputation_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badge" ADD CONSTRAINT "user_badge_badge_id_badge_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post" ADD CONSTRAINT "blog_post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tag" ADD CONSTRAINT "blog_post_tag_post_id_blog_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tag" ADD CONSTRAINT "blog_post_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_agenda_item" ADD CONSTRAINT "event_agenda_item_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_image" ADD CONSTRAINT "event_image_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_speaker" ADD CONSTRAINT "event_speaker_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_speaker" ADD CONSTRAINT "event_speaker_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tag" ADD CONSTRAINT "event_tag_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tag" ADD CONSTRAINT "event_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_posted_by_user_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skill" ADD CONSTRAINT "job_skill_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skill" ADD CONSTRAINT "job_skill_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_thread_id_forum_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post" ADD CONSTRAINT "forum_post_edited_by_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_report" ADD CONSTRAINT "forum_report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_report" ADD CONSTRAINT "forum_report_post_id_forum_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_report" ADD CONSTRAINT "forum_report_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_subscription" ADD CONSTRAINT "forum_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_subscription" ADD CONSTRAINT "forum_subscription_thread_id_forum_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_category_id_forum_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."forum_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_thread" ADD CONSTRAINT "forum_thread_last_post_by_user_id_fk" FOREIGN KEY ("last_post_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_thread_tag" ADD CONSTRAINT "forum_thread_tag_thread_id_forum_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."forum_thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_thread_tag" ADD CONSTRAINT "forum_thread_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_vote" ADD CONSTRAINT "forum_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_vote" ADD CONSTRAINT "forum_vote_post_id_forum_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "reputation_event_user_idx" ON "reputation_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "blog_post_status_published_idx" ON "blog_post" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "event_status_start_idx" ON "event" USING btree ("status","start_date");--> statement-breakpoint
CREATE INDEX "event_featured_idx" ON "event" USING btree ("featured","start_date");--> statement-breakpoint
CREATE INDEX "event_agenda_event_idx" ON "event_agenda_item" USING btree ("event_id","position");--> statement-breakpoint
CREATE INDEX "event_image_event_idx" ON "event_image" USING btree ("event_id","position");--> statement-breakpoint
CREATE INDEX "event_rsvp_event_status_idx" ON "event_rsvp" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "event_rsvp_user_idx" ON "event_rsvp" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_speaker_event_idx" ON "event_speaker" USING btree ("event_id","position");--> statement-breakpoint
CREATE INDEX "job_status_posted_idx" ON "job" USING btree ("status","posted_on");--> statement-breakpoint
CREATE INDEX "job_featured_idx" ON "job" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "submission_status_idx" ON "submission" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "forum_post_thread_idx" ON "forum_post" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_post_author_idx" ON "forum_post" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "forum_report_status_idx" ON "forum_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "forum_thread_list_idx" ON "forum_thread" USING btree ("category_id","is_pinned","last_post_at");--> statement-breakpoint
CREATE INDEX "forum_thread_latest_idx" ON "forum_thread" USING btree ("status","last_post_at");--> statement-breakpoint
CREATE INDEX "forum_thread_author_idx" ON "forum_thread" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "search_document_type_idx" ON "search_document" USING btree ("entity_type");