-- Broodmare flag + cover/scan scheduling
-- Assumes horses.id is UUID

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Mark filly as broodmare candidate
ALTER TABLE horses
ADD COLUMN IF NOT EXISTS broodmare_flag BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS horses_broodmare_flag_idx ON horses (broodmare_flag);

-- Master rules for scan scheduling (days after cover)
CREATE TABLE IF NOT EXISTS repro_followup_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  days_after INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cover (mating) events
CREATE TABLE IF NOT EXISTS repro_covers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  cover_date DATE NOT NULL,
  stallion_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repro_covers_horse_date_idx
  ON repro_covers(horse_id, cover_date DESC);

-- Scan events (scheduled + actual)
CREATE TABLE IF NOT EXISTS repro_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cover_id UUID NOT NULL REFERENCES repro_covers(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  actual_date DATE,
  result TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repro_scans_horse_scheduled_idx
  ON repro_scans(horse_id, scheduled_date);

-- RPC: create cover + scheduled scans from rule
CREATE OR REPLACE FUNCTION repro_create_cover(
  horse_id UUID,
  cover_date DATE,
  stallion_name TEXT DEFAULT NULL,
  note TEXT DEFAULT NULL,
  p_rule_name TEXT DEFAULT 'default'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_cover_id UUID;
  v_days INTEGER[];
  v_day INTEGER;
BEGIN
  SELECT days_after INTO v_days
  FROM repro_followup_rules
  WHERE rule_name = p_rule_name AND enabled = true
  LIMIT 1;

  IF v_days IS NULL THEN
    v_days := ARRAY[]::INTEGER[];
  END IF;

  INSERT INTO repro_covers (horse_id, cover_date, stallion_name, note, created_at, updated_at)
  VALUES (horse_id, cover_date, stallion_name, note, now(), now())
  RETURNING id INTO v_cover_id;

  FOREACH v_day IN ARRAY v_days
  LOOP
    INSERT INTO repro_scans (cover_id, horse_id, scheduled_date, created_at, updated_at)
    VALUES (v_cover_id, horse_id, cover_date + v_day, now(), now());
  END LOOP;

  RETURN v_cover_id;
END;
$$;
