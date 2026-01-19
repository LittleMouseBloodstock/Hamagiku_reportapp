-- Enable Row Level Security (just in case it's not on)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'clients' table
-- Drop existing policies to avoid conflicts (optional, but cleaner)
DROP POLICY IF EXISTS "Allow authenticated delete" ON clients;
DROP POLICY IF EXISTS "Allow authenticated all" ON clients;

-- Grant FULL access (SELECT, INSERT, UPDATE, DELETE) to authenticated users
CREATE POLICY "Allow authenticated all" ON clients
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Policies for 'horses' table
DROP POLICY IF EXISTS "Allow authenticated delete" ON horses;
DROP POLICY IF EXISTS "Allow authenticated all" ON horses;

-- Grant FULL access (SELECT, INSERT, UPDATE, DELETE) to authenticated users
CREATE POLICY "Allow authenticated all" ON horses
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Policies for 'reports' table (Ensure reports can also be managed)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated all" ON reports;

CREATE POLICY "Allow authenticated all" ON reports
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
