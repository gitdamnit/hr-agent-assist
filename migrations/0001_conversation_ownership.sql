-- Add per-user ownership to conversations.
-- Applied automatically by docker-compose on a fresh volume; run manually
-- (`psql "$DATABASE_URL" -f migrations/0001_conversation_ownership.sql`)
-- for an existing database.

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "user_id" varchar;

-- Legacy rows created before auth existed have no owner and cannot be
-- attributed safely. This is a prototype database; drop them.
DELETE FROM "conversations" WHERE "user_id" IS NULL;

ALTER TABLE "conversations" ALTER COLUMN "user_id" SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations" ("user_id");
