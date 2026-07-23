CREATE TYPE "public"."phase" AS ENUM('baseline', 'within');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('easy', 'long', 'tempo', 'interval', 'recovery', 'race', 'other');--> statement-breakpoint
CREATE TABLE "daily_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"phase" "phase" NOT NULL,
	"recovery" integer NOT NULL,
	"resting_hr" integer NOT NULL,
	"sleep_hours" numeric(3, 1) NOT NULL,
	"hooper_sleep" integer NOT NULL,
	"hooper_fatigue" integer NOT NULL,
	"hooper_soreness" integer NOT NULL,
	"hooper_stress" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"passcode_hash" text NOT NULL,
	"in_cohort" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"cohort_start_date" date,
	"timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"phase" "phase" NOT NULL,
	"session_type" "session_type" NOT NULL,
	"session_type_other" text,
	"rpe" integer NOT NULL,
	"duration_min" integer NOT NULL,
	"distance_km" numeric(4, 1) NOT NULL,
	"took_serving" boolean,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkin_member_day" ON "daily_checkins" USING btree ("member_id","local_date");