-- Add sex to horses
ALTER TABLE horses
ADD COLUMN IF NOT EXISTS sex TEXT;

CREATE INDEX IF NOT EXISTS horses_sex_idx ON horses (sex);
