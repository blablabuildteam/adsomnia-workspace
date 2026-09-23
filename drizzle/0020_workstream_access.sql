CREATE TYPE "public"."workstream_access_level" AS ENUM('view', 'edit');
--> statement-breakpoint
CREATE TABLE "workstream_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"initiative_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"level" "workstream_access_level" NOT NULL,
	"granted_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workstream_access_initiative_user_unique" UNIQUE("initiative_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workstream_access" ADD CONSTRAINT "workstream_access_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workstream_access" ADD CONSTRAINT "workstream_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workstream_access" ADD CONSTRAINT "workstream_access_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workstream_access_user_id_idx" ON "workstream_access" USING btree ("user_id");
