CREATE TYPE "public"."finance_budget_level" AS ENUM('DIRECTORATE','PROGRAMME','PROJECT','ACTIVITY');

ALTER TABLE "programmes" ADD COLUMN "directorate_id" uuid REFERENCES "directorates"("id");

ALTER TABLE "finance_budgets" ADD COLUMN "level" "public"."finance_budget_level" DEFAULT 'PROJECT' NOT NULL;
ALTER TABLE "finance_budgets" ADD COLUMN "directorate_id" uuid REFERENCES "directorates"("id");
ALTER TABLE "finance_budgets" ADD COLUMN "programme_id" uuid REFERENCES "programmes"("id");
ALTER TABLE "finance_budgets" ALTER COLUMN "project_id" DROP NOT NULL;
ALTER TABLE "finance_budgets" ADD COLUMN "activity_id" uuid REFERENCES "activities"("id");
ALTER TABLE "finance_budgets" ADD COLUMN "parent_budget_id" uuid;
ALTER TABLE "finance_budgets" ADD CONSTRAINT "finance_budgets_parent_budget_id_fk" FOREIGN KEY ("parent_budget_id") REFERENCES "finance_budgets"("id");

ALTER TABLE "finance_budgets" ADD CONSTRAINT "finance_budget_scope_check" CHECK (
  ("level" = 'DIRECTORATE' AND "directorate_id" IS NOT NULL AND "programme_id" IS NULL AND "project_id" IS NULL AND "activity_id" IS NULL)
  OR
  ("level" = 'PROGRAMME' AND "directorate_id" IS NULL AND "programme_id" IS NOT NULL AND "project_id" IS NULL AND "activity_id" IS NULL)
  OR
  ("level" = 'PROJECT' AND "directorate_id" IS NULL AND "programme_id" IS NULL AND "project_id" IS NOT NULL AND "activity_id" IS NULL)
  OR
  ("level" = 'ACTIVITY' AND "directorate_id" IS NULL AND "programme_id" IS NULL AND "project_id" IS NULL AND "activity_id" IS NOT NULL)
);

CREATE UNIQUE INDEX "finance_budget_directorate_year_unique" ON "finance_budgets" ("directorate_id", "financial_year") WHERE "level" = 'DIRECTORATE';
CREATE UNIQUE INDEX "finance_budget_programme_year_unique" ON "finance_budgets" ("programme_id", "financial_year") WHERE "level" = 'PROGRAMME';
CREATE UNIQUE INDEX "finance_budget_activity_year_unique" ON "finance_budgets" ("activity_id", "financial_year") WHERE "level" = 'ACTIVITY';
