CREATE TYPE "public"."finance_budget_status" AS ENUM('DRAFT','APPROVED','CLOSED');
CREATE TYPE "public"."finance_expense_status" AS ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED','PAID');
CREATE TABLE "finance_budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "financial_year" integer NOT NULL,
  "budget_code" varchar(64) NOT NULL UNIQUE,
  "amount_zmw" numeric(16,2) NOT NULL,
  "status" "finance_budget_status" DEFAULT 'DRAFT' NOT NULL,
  "notes" text,
  CONSTRAINT "finance_budget_project_year_unique" UNIQUE("project_id","financial_year")
);
CREATE TABLE "finance_expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "budget_id" uuid NOT NULL REFERENCES "finance_budgets"("id"),
  "expense_date" date NOT NULL,
  "description" varchar(240) NOT NULL,
  "category" varchar(80) NOT NULL,
  "amount_zmw" numeric(16,2) NOT NULL,
  "status" "finance_expense_status" DEFAULT 'DRAFT' NOT NULL,
  "submitted_by_user_id" uuid,
  "approved_by_user_id" uuid,
  "approved_at" timestamptz,
  "notes" text
);
