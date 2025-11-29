-- Enable pgvector extension in Supabase
-- Run this in the Supabase SQL Editor

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to vector_documents table
ALTER TABLE vector_documents 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for fast similarity search
CREATE INDEX IF NOT EXISTS vector_documents_embedding_idx 
ON vector_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_project_id uuid DEFAULT NULL,
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
    id uuid,
    project_id uuid,
    content text,
    metadata jsonb,
    source_type text,
    chunk_index int,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vd.id,
        vd.project_id,
        vd.content,
        vd.metadata,
        vd.source_type,
        vd.chunk_index,
        1 - (vd.embedding <=> query_embedding) AS similarity
    FROM vector_documents vd
    WHERE 
        (match_project_id IS NULL OR vd.project_id = match_project_id)
        AND vd.embedding IS NOT NULL
        AND 1 - (vd.embedding <=> query_embedding) > match_threshold
    ORDER BY vd.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Verify setup
SELECT 
    'pgvector extension' as check_type,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
         THEN '✅ Enabled' 
         ELSE '❌ Not enabled' 
    END as status
UNION ALL
SELECT 
    'embedding column' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vector_documents' AND column_name = 'embedding'
    ) 
         THEN '✅ Exists' 
         ELSE '❌ Not found' 
    END as status;



