-- Vet checks (independent of cover)
-- Assumes horses.id is UUID

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS repro_vet_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repro_vet_checks_horse_date_idx
  ON repro_vet_checks(horse_id, check_date DESC);
