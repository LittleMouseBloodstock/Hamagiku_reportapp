-- Add detailed columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_prefecture TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS representative_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update RLS policies to ensure these new columns are accessible (though existing policies on table should cover it)
-- Just in case, re-verify public access policies exist (as per previous fix)
-- (The previous fix enabled access to the whole table, so new columns should be covered automatically)
