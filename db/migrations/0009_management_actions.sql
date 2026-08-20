CREATE TYPE "public"."management_action_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "management_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "entity_type" varchar(80) NOT NULL,
  "entity_id" uuid NOT NULL,
  "source" varchar(80) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "finding" text NOT NULL,
  "recommendation" text NOT NULL,
  "decision" text,
  "decision_by_user_id" uuid,
  "decision_at" timestamp with time zone,
  "action_owner_user_id" uuid,
  "due_date" date,
  "status" "public"."management_action_status" DEFAULT 'OPEN' NOT NULL,
  "resolution" text
);

CREATE INDEX "management_actions_entity_idx" ON "management_actions" ("entity_type", "entity_id");
CREATE INDEX "management_actions_status_idx" ON "management_actions" ("status");
CREATE INDEX "management_actions_due_date_idx" ON "management_actions" ("due_date");
