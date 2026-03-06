-- Add parent-child chunk support
ALTER TABLE "vector_documents" ADD COLUMN IF NOT EXISTS "parent_id" TEXT;
ALTER TABLE "vector_documents" ADD COLUMN IF NOT EXISTS "context_header" TEXT;
ALTER TABLE "vector_documents" ADD COLUMN IF NOT EXISTS "token_count" INTEGER DEFAULT 0;

-- Create index on parent_id for fast parent chunk lookups
CREATE INDEX IF NOT EXISTS "vector_documents_parent_id_idx" ON "vector_documents"("parent_id");

-- Add tsvector column for BM25 full-text search
ALTER TABLE "vector_documents" ADD COLUMN IF NOT EXISTS "tsv" tsvector;

-- Populate tsvector for existing rows
UPDATE "vector_documents" SET "tsv" = to_tsvector('english', "content") WHERE "tsv" IS NULL;

-- Create GIN index for fast full-text search (BM25-like ranking)
CREATE INDEX IF NOT EXISTS "vector_documents_tsv_idx" ON "vector_documents" USING GIN("tsv");

-- Create a trigger to auto-update tsvector on insert/update
CREATE OR REPLACE FUNCTION vector_documents_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('english', NEW.content);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvectorupdate ON "vector_documents";
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE OF content
  ON "vector_documents" FOR EACH ROW EXECUTE FUNCTION vector_documents_tsv_trigger();
