-- Report drafts (server-side autosave)
-- Assumes reports.id and horses.id are UUID.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS report_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_key TEXT NOT NULL UNIQUE,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL DEFAULT 'monthly',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_drafts_updated_idx
  ON report_drafts(updated_at DESC);
