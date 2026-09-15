ALTER TABLE "session_logs" ADD COLUMN "servings" integer;--> statement-breakpoint
-- Carry any existing yes/no answers into the count: a yes was one serving,
-- a no was none, and a baseline null stays null.
UPDATE "session_logs" SET "servings" = CASE WHEN "took_serving" THEN 1 WHEN NOT "took_serving" THEN 0 END WHERE "took_serving" IS NOT NULL;