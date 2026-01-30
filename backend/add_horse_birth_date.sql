-- Add birth_date to horses
ALTER TABLE horses
ADD COLUMN IF NOT EXISTS birth_date DATE;
