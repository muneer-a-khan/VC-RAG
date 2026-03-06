-- Enable the pgvector extension (requires Supabase dashboard or superuser access)
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column to vector_documents table
-- Using 1536 dimensions to match Voyage AI voyage-large-2 model output
ALTER TABLE vector_documents
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 3: Create an HNSW index for fast cosine similarity search
-- HNSW works well even on empty tables (unlike IVFFlat which needs pre-existing data)
CREATE INDEX IF NOT EXISTS idx_vector_documents_embedding
ON vector_documents
USING hnsw (embedding vector_cosine_ops);

-- Step 4: Create a partial index for project-scoped searches
CREATE INDEX IF NOT EXISTS idx_vector_documents_project_embedding
ON vector_documents (project_id)
WHERE embedding IS NOT NULL;
