ALTER TABLE "finance_budgets" ADD COLUMN "created_by_user_id" uuid;

UPDATE "finance_budgets" AS b
SET "created_by_user_id" = a."actor_user_id"
FROM "audit_events" AS a
WHERE a."entity_type" = 'finance_budget'
  AND a."entity_id" = b."id"
  AND a."action" = 'FINANCE_BUDGET_CREATED'
  AND b."created_by_user_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "finance_budgets" WHERE "created_by_user_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce budget creator separation: one or more existing finance budgets have no FINANCE_BUDGET_CREATED audit event.';
  END IF;
END $$;

ALTER TABLE "finance_budgets" ALTER COLUMN "created_by_user_id" SET NOT NULL;
