-- 1. Enable RLS on all tables (Security First)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing policies (Reset)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON reports;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON reports;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON reports;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON reports;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON reports;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON horses;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON clients;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON allowed_users;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON allowed_users;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON allowed_users;


-- 3. Apply Permissive Policies for Authenticated Users
--    We rely on the "allowed_users" whitelist check in the App Logic (AuthContext) 
--    to prevent unauthorized logins. Once logged in, the user has full access.

-- Reports
CREATE POLICY "Enable all for authenticated users" ON reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Horses
CREATE POLICY "Enable all for authenticated users" ON horses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clients
CREATE POLICY "Enable all for authenticated users" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allowed Users (Read/Write for admin features)
CREATE POLICY "Enable all for authenticated users" ON allowed_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
