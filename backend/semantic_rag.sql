CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS domain_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ja',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES domain_knowledge(id) ON DELETE CASCADE,
  workspace_id UUID NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  horse_id UUID NULL REFERENCES horses(id) ON DELETE SET NULL,
  client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'ja',
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS report_chunks_embedding_idx
  ON report_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding_text TEXT,
  match_count INTEGER,
  filter_language TEXT,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  knowledge_id UUID,
  category TEXT,
  title TEXT,
  content TEXT,
  language TEXT,
  metadata JSONB,
  updated_at TIMESTAMPTZ,
  similarity DOUBLE PRECISION
)
LANGUAGE SQL
AS $$
  SELECT
    dk.id AS knowledge_id,
    dk.category,
    dk.title,
    dk.content,
    dk.language,
    dk.metadata,
    dk.updated_at,
    1 - (kc.embedding <=> query_embedding_text::vector) AS similarity
  FROM knowledge_chunks kc
  JOIN domain_knowledge dk ON dk.id = kc.knowledge_id
  WHERE dk.is_active = true
    AND dk.language = filter_language
    AND (filter_category IS NULL OR dk.category = filter_category)
    AND kc.embedding IS NOT NULL
  ORDER BY kc.embedding <=> query_embedding_text::vector
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION match_report_chunks(
  query_embedding_text TEXT,
  match_count INTEGER,
  filter_horse_id UUID DEFAULT NULL,
  filter_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  report_id UUID,
  horse_id UUID,
  client_id UUID,
  body TEXT,
  metrics_json JSONB,
  created_at TIMESTAMPTZ,
  similarity DOUBLE PRECISION
)
LANGUAGE SQL
AS $$
  SELECT
    r.id AS report_id,
    r.horse_id,
    r.client_id,
    r.body,
    r.metrics_json,
    r.created_at,
    1 - (rc.embedding <=> query_embedding_text::vector) AS similarity
  FROM report_chunks rc
  JOIN reports r ON r.id = rc.report_id
  WHERE (filter_horse_id IS NULL OR r.horse_id = filter_horse_id OR (1 - (rc.embedding <=> query_embedding_text::vector)) > 0.82)
    AND (filter_client_id IS NULL OR r.client_id = filter_client_id OR (1 - (rc.embedding <=> query_embedding_text::vector)) > 0.8)
    AND rc.embedding IS NOT NULL
  ORDER BY rc.embedding <=> query_embedding_text::vector
  LIMIT match_count;
$$;
