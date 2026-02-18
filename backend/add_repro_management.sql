-- Repro management tables, functions, and RPC helpers (Supabase)
-- Note: This script assumes horses.id is UUID.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core repro checks
CREATE TABLE IF NOT EXISTS repro_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  performed_at TIMESTAMPTZ NOT NULL,
  method TEXT NOT NULL DEFAULT 'palpation',
  note_text TEXT,
  language_hint TEXT,
  interventions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repro_checks_horse_date_idx
  ON repro_checks(horse_id, performed_at DESC);

-- Findings per check
CREATE TABLE IF NOT EXISTS repro_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repro_check_id UUID NOT NULL REFERENCES repro_checks(id) ON DELETE CASCADE,
  organ TEXT NOT NULL,
  side TEXT NOT NULL,
  finding_type TEXT NOT NULL,
  size_mm INTEGER,
  value TEXT,
  palpation_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repro_findings_check_idx
  ON repro_findings(repro_check_id);

-- Daily snapshot
CREATE TABLE IF NOT EXISTS repro_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  latest_repro_check_id UUID NOT NULL REFERENCES repro_checks(id) ON DELETE CASCADE,
  latest_performed_at TIMESTAMPTZ NOT NULL,
  max_follicle_mm_r INTEGER,
  max_follicle_mm_l INTEGER,
  follicle_feel_r TEXT,
  follicle_feel_l TEXT,
  cervix_state TEXT,
  uterus_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  uterus_tone TEXT,
  interventions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS repro_daily_snapshots_horse_date_idx
  ON repro_daily_snapshots(horse_id, date);

-- Follow-up tasks
CREATE TABLE IF NOT EXISTS repro_follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_check_id UUID NOT NULL REFERENCES repro_checks(id) ON DELETE CASCADE,
  trigger_at TIMESTAMPTZ NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  done_check_id UUID REFERENCES repro_checks(id) ON DELETE SET NULL,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repro_follow_up_tasks_status_idx
  ON repro_follow_up_tasks(status);

CREATE INDEX IF NOT EXISTS repro_follow_up_tasks_due_idx
  ON repro_follow_up_tasks(due_at);

-- Recompute snapshot for a given horse/day
CREATE OR REPLACE FUNCTION repro_recompute_daily_snapshot(p_horse_id UUID, p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_latest_check_id UUID;
  v_latest_performed_at TIMESTAMPTZ;
  v_max_r INTEGER;
  v_max_l INTEGER;
  v_tags_r JSONB;
  v_tags_l JSONB;
  v_feel_r TEXT;
  v_feel_l TEXT;
  v_cervix_state TEXT;
  v_uterus_tone TEXT;
  v_uterus_flags JSONB;
  v_interventions JSONB;
BEGIN
  SELECT id, performed_at
    INTO v_latest_check_id, v_latest_performed_at
  FROM repro_checks
  WHERE horse_id = p_horse_id
    AND performed_at::date = p_date
  ORDER BY performed_at DESC
  LIMIT 1;

  IF v_latest_check_id IS NULL THEN
    DELETE FROM repro_daily_snapshots
    WHERE horse_id = p_horse_id AND date = p_date;
    RETURN;
  END IF;

  SELECT size_mm, palpation_tags
    INTO v_max_r, v_tags_r
  FROM repro_findings
  WHERE repro_check_id = v_latest_check_id
    AND finding_type = 'follicle'
    AND side = 'R'
    AND size_mm IS NOT NULL
  ORDER BY size_mm DESC
  LIMIT 1;

  SELECT size_mm, palpation_tags
    INTO v_max_l, v_tags_l
  FROM repro_findings
  WHERE repro_check_id = v_latest_check_id
    AND finding_type = 'follicle'
    AND side = 'L'
    AND size_mm IS NOT NULL
  ORDER BY size_mm DESC
  LIMIT 1;

  v_feel_r := CASE
    WHEN v_tags_r ? 'soft' THEN 'soft'
    WHEN v_tags_r ? 'firm' THEN 'firm'
    ELSE NULL
  END;

  v_feel_l := CASE
    WHEN v_tags_l ? 'soft' THEN 'soft'
    WHEN v_tags_l ? 'firm' THEN 'firm'
    ELSE NULL
  END;

  SELECT value
    INTO v_cervix_state
  FROM repro_findings
  WHERE repro_check_id = v_latest_check_id
    AND finding_type = 'cervix_laxity'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT value
    INTO v_uterus_tone
  FROM repro_findings
  WHERE repro_check_id = v_latest_check_id
    AND finding_type = 'uterine_tone'
  ORDER BY created_at DESC
  LIMIT 1;

  v_uterus_flags := jsonb_build_object(
    'edema', EXISTS(
      SELECT 1 FROM repro_findings
      WHERE repro_check_id = v_latest_check_id
        AND finding_type = 'uterine_edema'
    ),
    'fluid', EXISTS(
      SELECT 1 FROM repro_findings
      WHERE repro_check_id = v_latest_check_id
        AND finding_type = 'fluid_retention'
    )
  );

  SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb)
    INTO v_interventions
  FROM repro_checks rc
  LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(rc.interventions, '[]'::jsonb)) AS elem ON TRUE
  WHERE rc.horse_id = p_horse_id
    AND rc.performed_at::date = p_date;

  INSERT INTO repro_daily_snapshots (
    horse_id,
    date,
    latest_repro_check_id,
    latest_performed_at,
    max_follicle_mm_r,
    max_follicle_mm_l,
    follicle_feel_r,
    follicle_feel_l,
    cervix_state,
    uterus_flags,
    uterus_tone,
    interventions,
    updated_at
  ) VALUES (
    p_horse_id,
    p_date,
    v_latest_check_id,
    v_latest_performed_at,
    v_max_r,
    v_max_l,
    v_feel_r,
    v_feel_l,
    v_cervix_state,
    v_uterus_flags,
    v_uterus_tone,
    v_interventions,
    now()
  )
  ON CONFLICT (horse_id, date) DO UPDATE SET
    latest_repro_check_id = EXCLUDED.latest_repro_check_id,
    latest_performed_at = EXCLUDED.latest_performed_at,
    max_follicle_mm_r = EXCLUDED.max_follicle_mm_r,
    max_follicle_mm_l = EXCLUDED.max_follicle_mm_l,
    follicle_feel_r = EXCLUDED.follicle_feel_r,
    follicle_feel_l = EXCLUDED.follicle_feel_l,
    cervix_state = EXCLUDED.cervix_state,
    uterus_flags = EXCLUDED.uterus_flags,
    uterus_tone = EXCLUDED.uterus_tone,
    interventions = EXCLUDED.interventions,
    updated_at = now();
END;
$$;

-- Create a repro check with findings and follow-up tasks
CREATE OR REPLACE FUNCTION repro_create_check(
  horse_id UUID,
  performed_at TIMESTAMPTZ,
  method TEXT DEFAULT 'palpation',
  note_text TEXT DEFAULT NULL,
  language_hint TEXT DEFAULT NULL,
  interventions JSONB DEFAULT '[]'::jsonb,
  findings JSONB DEFAULT '[]'::jsonb,
  follow_task_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_check_id UUID;
  v_item JSONB;
  v_intervention TEXT;
BEGIN
  INSERT INTO repro_checks (
    horse_id, performed_at, method, note_text, language_hint, interventions, created_at, updated_at
  ) VALUES (
    horse_id, performed_at, method, note_text, language_hint, COALESCE(interventions, '[]'::jsonb), now(), now()
  )
  RETURNING id INTO v_check_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(findings, '[]'::jsonb))
  LOOP
    INSERT INTO repro_findings (
      repro_check_id, organ, side, finding_type, size_mm, value, palpation_tags, comment, created_at
    ) VALUES (
      v_check_id,
      v_item->>'organ',
      COALESCE(v_item->>'side', 'unknown'),
      v_item->>'finding_type',
      NULLIF(v_item->>'size_mm', '')::INTEGER,
      v_item->>'value',
      COALESCE(v_item->'palpation_tags', '[]'::jsonb),
      v_item->>'comment',
      now()
    );
  END LOOP;

  FOR v_intervention IN
    SELECT jsonb_array_elements_text(COALESCE(interventions, '[]'::jsonb))
  LOOP
    IF v_intervention IN ('deslorelin', 'mating') THEN
      INSERT INTO repro_follow_up_tasks (
        horse_id,
        trigger_type,
        trigger_check_id,
        trigger_at,
        remind_at,
        due_at,
        status,
        created_at,
        updated_at
      ) VALUES (
        horse_id,
        v_intervention,
        v_check_id,
        performed_at,
        performed_at + interval '24 hours',
        performed_at + interval '48 hours',
        'open',
        now(),
        now()
      );
    END IF;
  END LOOP;

  IF follow_task_id IS NOT NULL THEN
    UPDATE repro_follow_up_tasks
      SET status = 'done',
          done_check_id = v_check_id,
          done_at = now(),
          updated_at = now()
    WHERE id = follow_task_id;
  END IF;

  PERFORM repro_recompute_daily_snapshot(horse_id, performed_at::date);

  RETURN v_check_id;
END;
$$;

-- Recompute follow-up task status (reminded/overdue)
CREATE OR REPLACE FUNCTION repro_recompute_follow_up_status()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_overdue INTEGER;
  v_reminded INTEGER;
BEGIN
  UPDATE repro_follow_up_tasks
    SET status = 'overdue', updated_at = now()
  WHERE status IN ('open', 'reminded')
    AND due_at < now();
  GET DIAGNOSTICS v_overdue = ROW_COUNT;

  UPDATE repro_follow_up_tasks
    SET status = 'reminded', updated_at = now()
  WHERE status = 'open'
    AND remind_at < now();
  GET DIAGNOSTICS v_reminded = ROW_COUNT;

  RETURN v_overdue + v_reminded;
END;
$$;
