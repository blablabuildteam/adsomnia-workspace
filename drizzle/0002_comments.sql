CREATE TABLE IF NOT EXISTS "comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "initiative_id" serial NOT NULL REFERENCES "initiatives"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
