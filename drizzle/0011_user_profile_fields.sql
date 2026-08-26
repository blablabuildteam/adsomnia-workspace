ALTER TABLE "users" ADD COLUMN "first_name" varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_completed_at" timestamp with time zone;