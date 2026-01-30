-- Create horse_weights table for weekly measurements
CREATE TABLE IF NOT EXISTS horse_weights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    measured_at date NOT NULL,
    weight numeric,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS horse_weights_unique ON horse_weights (horse_id, measured_at);
CREATE INDEX IF NOT EXISTS horse_weights_horse_id_idx ON horse_weights (horse_id);
CREATE INDEX IF NOT EXISTS horse_weights_measured_at_idx ON horse_weights (measured_at);

ALTER TABLE horse_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON horse_weights;
CREATE POLICY "Enable all for authenticated users" ON horse_weights FOR ALL TO authenticated USING (true) WITH CHECK (true);
