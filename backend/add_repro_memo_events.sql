-- Free memo events for dashboard calendar
-- Assumes horses.id is UUID (optional link)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS repro_memo_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  horse_id UUID REFERENCES horses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repro_memo_events_date_idx
  ON repro_memo_events(event_date);
