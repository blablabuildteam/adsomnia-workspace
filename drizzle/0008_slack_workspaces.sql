CREATE TABLE "slack_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar(64) NOT NULL,
	"team_name" varchar(255) NOT NULL,
	"bot_token" text NOT NULL,
	"bot_user_id" varchar(64) NOT NULL,
	"installed_by_user_id" uuid NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slack_workspaces_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
ALTER TABLE "slack_workspaces" ADD CONSTRAINT "slack_workspaces_installed_by_user_id_users_id_fk" FOREIGN KEY ("installed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;