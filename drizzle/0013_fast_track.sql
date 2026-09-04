ALTER TABLE "initiatives" ADD COLUMN "is_fast_track" boolean DEFAULT false NOT NULL;
ALTER TABLE "initiatives" ADD COLUMN "fast_track_jira_key" varchar(32);
ALTER TABLE "initiatives" ADD COLUMN "fast_track_jira_url" varchar(500);
