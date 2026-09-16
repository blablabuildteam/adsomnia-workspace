ALTER TABLE "comments" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "guest_author_name" varchar(120);
