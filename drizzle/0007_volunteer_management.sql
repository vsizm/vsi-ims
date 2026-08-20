CREATE TYPE "public"."volunteer_status" AS ENUM('APPLICANT','ACTIVE','INACTIVE','ALUMNI');
CREATE TYPE "public"."volunteer_assignment_status" AS ENUM('PLANNED','ACTIVE','COMPLETED','CANCELLED');
CREATE TABLE "volunteers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "volunteer_code" varchar(64) NOT NULL UNIQUE,
  "full_name" varchar(240) NOT NULL,
  "email" varchar(240),
  "phone" varchar(40),
  "date_of_birth" date,
  "sex" "beneficiary_sex" DEFAULT 'NOT_STATED' NOT NULL,
  "province_id" uuid REFERENCES "provinces"("id"),
  "district_id" uuid REFERENCES "districts"("id"),
  "status" "volunteer_status" DEFAULT 'APPLICANT' NOT NULL,
  "joined_at" date,
  "notes" text
);
CREATE TABLE "volunteer_skills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "volunteer_id" uuid NOT NULL REFERENCES "volunteers"("id"),
  "skill" varchar(120) NOT NULL,
  "proficiency" varchar(40),
  "verified" boolean DEFAULT false NOT NULL,
  CONSTRAINT "volunteer_skill_unique" UNIQUE("volunteer_id","skill")
);
CREATE TABLE "volunteer_training" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "volunteer_id" uuid NOT NULL REFERENCES "volunteers"("id"),
  "title" varchar(180) NOT NULL,
  "training_date" date NOT NULL,
  "provider" varchar(180),
  "certificate_reference" varchar(120),
  "completed" boolean DEFAULT true NOT NULL
);
CREATE TABLE "volunteer_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "volunteer_id" uuid NOT NULL REFERENCES "volunteers"("id"),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "activity_id" uuid REFERENCES "activities"("id"),
  "district_id" uuid REFERENCES "districts"("id"),
  "delivery_site_id" uuid REFERENCES "delivery_sites"("id"),
  "role" varchar(120) NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "status" "volunteer_assignment_status" DEFAULT 'PLANNED' NOT NULL,
  "notes" text
);
CREATE TABLE "volunteer_participation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "volunteer_id" uuid NOT NULL REFERENCES "volunteers"("id"),
  "activity_id" uuid NOT NULL REFERENCES "activities"("id"),
  "participation_date" date NOT NULL,
  "hours" numeric(8,2) NOT NULL,
  "notes" text,
  CONSTRAINT "volunteer_participation_unique" UNIQUE("volunteer_id","activity_id","participation_date")
);
CREATE TABLE "volunteer_recognition" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "volunteer_id" uuid NOT NULL REFERENCES "volunteers"("id"),
  "recognition_date" date NOT NULL,
  "title" varchar(180) NOT NULL,
  "description" text
);
