ALTER TABLE "finance_budgets" ADD COLUMN "created_by_user_id" uuid;
UPDATE "finance_budgets" SET "created_by_user_id" = '00000000-0000-0000-0000-000000000000' WHERE "created_by_user_id" IS NULL;
ALTER TABLE "finance_budgets" ALTER COLUMN "created_by_user_id" SET NOT NULL;
