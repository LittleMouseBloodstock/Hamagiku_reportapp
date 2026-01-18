-- Allow public access to clients and horses tables for development

-- CLIENTS TABLE
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop ALL potential existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
DROP POLICY IF EXISTS "Enable insert for all users" ON clients;
DROP POLICY IF EXISTS "Enable update for all users" ON clients;

-- Create public policies
CREATE POLICY "Enable read access for all users" ON clients FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON clients FOR UPDATE USING (true);


-- HORSES TABLE
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;

-- Drop ALL potential existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable read access for all users" ON horses;
DROP POLICY IF EXISTS "Enable insert for all users" ON horses;
DROP POLICY IF EXISTS "Enable update for all users" ON horses;

-- Create public policies
CREATE POLICY "Enable read access for all users" ON horses FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON horses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON horses FOR UPDATE USING (true);
