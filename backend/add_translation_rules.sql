CREATE TABLE IF NOT EXISTS translation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_phrase TEXT NOT NULL,
  target_phrase TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  rule_type TEXT NOT NULL DEFAULT 'preferred_translation',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS translation_rules_priority_idx
  ON translation_rules (priority, created_at);

CREATE INDEX IF NOT EXISTS translation_rules_active_idx
  ON translation_rules (is_active, priority);

INSERT INTO translation_rules (source_phrase, target_phrase, priority, rule_type, metadata)
VALUES
  ('1ハロン', 'per furlong', 10, 'unit_translation', '{"scope":"monthly_report"}'::jsonb),
  ('坂路', 'uphill training', 20, 'preferred_translation', '{"scope":"monthly_report"}'::jsonb),
  ('鞍下', 'under saddle', 20, 'preferred_translation', '{"scope":"monthly_report"}'::jsonb),
  ('脚元', 'legs', 30, 'preferred_translation', '{"scope":"monthly_report"}'::jsonb),
  ('良好', 'good', 40, 'preferred_translation', '{"scope":"monthly_report"}'::jsonb)
ON CONFLICT DO NOTHING;
