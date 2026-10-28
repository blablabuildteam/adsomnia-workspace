CREATE TABLE "workstream_todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"initiative_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"body" varchar(500) NOT NULL,
	"stage" "initiative_stage" NOT NULL,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workstream_todos" ADD CONSTRAINT "workstream_todos_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workstream_todos" ADD CONSTRAINT "workstream_todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workstream_todos_initiative_user_idx" ON "workstream_todos" USING btree ("initiative_id","user_id");
