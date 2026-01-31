-- Add English trainer location column
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS trainer_location_en TEXT;
