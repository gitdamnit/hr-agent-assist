-- Initial schema for HR CARE
-- Generated from shared/schema.ts

CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"username" text NOT NULL UNIQUE,
	"password" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "conversations" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"session_data" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY,
	"conversation_id" integer NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "documents" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"filename" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"chunk_count" integer NOT NULL DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "document_chunks" (
	"id" serial PRIMARY KEY,
	"document_id" integer NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "document_chunks_document_id_idx" ON "document_chunks" ("document_id");
