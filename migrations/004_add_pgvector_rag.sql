-- Migration 004: Add pgvector for RAG (Serverless-Native Semantic Search)
--
-- WHY PGVECTOR: Scale-to-zero compatible, no cold-start penalty, single database
-- Replaces ChromaDB (requires always-on service or 30s reload on each wake)
--
-- PERFORMANCE:
-- - Cold start: ~1-2s (just DB connection)
-- - Semantic search: <100ms (with ivfflat index)
-- - No memory/disk wiping between sleeps
--
-- Date: November 9, 2025

-- Enable pgvector extension (Supabase includes this)
CREATE EXTENSION IF NOT EXISTS vector;

-- RAG embeddings table for semantic search
CREATE TABLE rag_embeddings (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small produces 1536 dimensions
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance

-- 1. Vector similarity search (ivfflat = fast approximate nearest neighbor)
-- Lists = 100 is good for up to ~100k vectors, adjust as data grows
CREATE INDEX rag_embeddings_embedding_idx ON rag_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 2. Metadata filtering (category, type, source)
CREATE INDEX rag_embeddings_metadata_idx ON rag_embeddings USING GIN (metadata);

-- 3. Full-text search for hybrid retrieval (semantic + keyword)
CREATE INDEX rag_embeddings_content_fts_idx ON rag_embeddings
  USING GIN (to_tsvector('english', content));

-- 4. Timestamp for sorting/filtering recent documents
CREATE INDEX rag_embeddings_created_at_idx ON rag_embeddings (created_at DESC);

-- Table comments for documentation
COMMENT ON TABLE rag_embeddings IS 'Semantic embeddings for RAG (Retrieval-Augmented Generation). Stores both static templates and user-generated tools for intelligent pattern matching.';
COMMENT ON COLUMN rag_embeddings.id IS 'Unique identifier: tool_reference_{id} for templates, {sessionId}_{title}_{timestamp} for generated tools';
COMMENT ON COLUMN rag_embeddings.content IS 'Full content (HTML for tools, text for knowledge). Used for both embedding generation and retrieval.';
COMMENT ON COLUMN rag_embeddings.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions). Used for cosine similarity search.';
COMMENT ON COLUMN rag_embeddings.metadata IS 'JSONB: {source: "tool_reference"|"generated", type: "knowledge"|"artifact", title, category, timestamp}';

-- Stats view for monitoring
CREATE VIEW rag_embeddings_stats AS
SELECT
  COUNT(*) as total_embeddings,
  COUNT(*) FILTER (WHERE metadata->>'source' = 'tool_reference') as static_templates,
  COUNT(*) FILTER (WHERE metadata->>'source' = 'generated') as generated_tools,
  COUNT(DISTINCT metadata->>'category') as unique_categories,
  MIN(created_at) as first_indexed,
  MAX(created_at) as last_indexed
FROM rag_embeddings;

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '✅ pgvector migration complete';
  RAISE NOTICE '   • Extension enabled: vector';
  RAISE NOTICE '   • Table created: rag_embeddings';
  RAISE NOTICE '   • Indexes: embedding (ivfflat), metadata (GIN), content (FTS), created_at';
  RAISE NOTICE '   • Ready for semantic search with scale-to-zero architecture';
END $$;
