-- Add departure and care fields to horses
ALTER TABLE horses
ADD COLUMN IF NOT EXISTS departure_date DATE,
ADD COLUMN IF NOT EXISTS last_farrier_date DATE,
ADD COLUMN IF NOT EXISTS last_farrier_note TEXT,
ADD COLUMN IF NOT EXISTS last_worming_date DATE,
ADD COLUMN IF NOT EXISTS last_worming_note TEXT;

CREATE INDEX IF NOT EXISTS horses_departure_date_idx ON horses (departure_date);
