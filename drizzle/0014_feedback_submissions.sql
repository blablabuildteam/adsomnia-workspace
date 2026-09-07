CREATE TYPE "public"."feedback_status" AS ENUM('open', 'resolved');
--> statement-breakpoint
CREATE TABLE "feedback_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"submitter_id" uuid NOT NULL,
	"page_path" varchar(500) NOT NULL,
	"page_url" varchar(1000),
	"user_agent" varchar(500),
	"viewport" varchar(40),
	"image_file_name" varchar(255),
	"image_mime_type" varchar(100),
	"image_data" text,
	"status" "feedback_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
