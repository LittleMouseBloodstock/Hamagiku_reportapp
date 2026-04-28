WITH ranked_rules AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        lower(trim(source_phrase)),
        lower(trim(target_phrase)),
        lower(trim(rule_type)),
        lower(trim(COALESCE(metadata->>'scope', '')))
      ORDER BY priority ASC, created_at ASC, id ASC
    ) AS row_rank
  FROM translation_rules
)
DELETE FROM translation_rules tr
USING ranked_rules rr
WHERE tr.id = rr.id
  AND rr.row_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS translation_rules_unique_phrase_idx
  ON translation_rules (
    lower(trim(source_phrase)),
    lower(trim(target_phrase)),
    lower(trim(rule_type)),
    lower(trim(COALESCE(metadata->>'scope', '')))
  );
