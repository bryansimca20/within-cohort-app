CREATE TABLE "cohort_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"start_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
