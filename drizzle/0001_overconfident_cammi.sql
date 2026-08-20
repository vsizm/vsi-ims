CREATE TYPE "public"."activity_approval_status" AS ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "approval_status" "activity_approval_status" DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "submitted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "approved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "rejection_reason" text;