-- Add trainers table and link horses to trainers
-- NOTE: Run this in Supabase SQL editor or your DB migration flow

CREATE TABLE IF NOT EXISTS trainers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_name text NOT NULL,
    trainer_name_en text,
    trainer_location text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE horses
    ADD COLUMN IF NOT EXISTS trainer_id uuid REFERENCES trainers(id);

CREATE INDEX IF NOT EXISTS trainers_name_idx ON trainers (trainer_name);
CREATE INDEX IF NOT EXISTS trainers_name_en_idx ON trainers (trainer_name_en);
CREATE INDEX IF NOT EXISTS horses_trainer_id_idx ON horses (trainer_id);
