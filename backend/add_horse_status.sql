-- Add horse_status to horses
ALTER TABLE horses
ADD COLUMN IF NOT EXISTS horse_status TEXT DEFAULT 'Active';

UPDATE horses
SET horse_status = 'Active'
WHERE horse_status IS NULL;

CREATE INDEX IF NOT EXISTS horses_status_idx ON horses (horse_status);
