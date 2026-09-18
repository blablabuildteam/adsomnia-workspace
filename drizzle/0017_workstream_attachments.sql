CREATE TABLE "workstream_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"initiative_id" integer NOT NULL,
	"kind" varchar(32) NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" text,
	"page_title" varchar(500),
	"file_name" varchar(255),
	"file_size" integer,
	"mime_type" varchar(120),
	"file_data" text,
	"added_by_user_id" uuid,
	"guest_author_name" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workstream_attachments" ADD CONSTRAINT "workstream_attachments_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workstream_attachments" ADD CONSTRAINT "workstream_attachments_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
