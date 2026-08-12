CREATE TYPE "public"."attendance_mode" AS ENUM('In-person', 'Hybrid', 'Online');--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "attendance_mode" "attendance_mode";