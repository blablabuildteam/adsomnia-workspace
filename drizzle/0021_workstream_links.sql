CREATE TYPE "public"."workstream_link_kind" AS ENUM('related', 'depends-on');
--> statement-breakpoint
CREATE TABLE "workstream_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_initiative_id" integer NOT NULL,
	"to_initiative_id" integer NOT NULL,
	"kind" "workstream_link_kind" DEFAULT 'related' NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workstream_links_pair_unique" UNIQUE("from_initiative_id","to_initiative_id"),
	CONSTRAINT "workstream_links_not_self" CHECK ("from_initiative_id" <> "to_initiative_id")
);
--> statement-breakpoint
ALTER TABLE "workstream_links" ADD CONSTRAINT "workstream_links_from_initiative_id_initiatives_id_fk" FOREIGN KEY ("from_initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workstream_links" ADD CONSTRAINT "workstream_links_to_initiative_id_initiatives_id_fk" FOREIGN KEY ("to_initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workstream_links" ADD CONSTRAINT "workstream_links_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workstream_links_to_initiative_id_idx" ON "workstream_links" USING btree ("to_initiative_id");
