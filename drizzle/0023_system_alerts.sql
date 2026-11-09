CREATE TABLE IF NOT EXISTS "system_alerts" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"state" varchar(100) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
