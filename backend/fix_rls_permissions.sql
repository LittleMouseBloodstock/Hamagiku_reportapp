-- Enable RLS on all tables (idempotent)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- 1. Reports Policy
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON reports;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON reports;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON reports;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON reports;

CREATE POLICY "Enable read access for authenticated users" ON reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON reports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON reports FOR DELETE TO authenticated USING (true);

-- 2. Horses Policy
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON horses;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON horses;

CREATE POLICY "Enable read access for authenticated users" ON horses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON horses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON horses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON horses FOR DELETE TO authenticated USING (true);

-- 3. Clients Policy
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON clients;

CREATE POLICY "Enable read access for authenticated users" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users" ON clients FOR DELETE TO authenticated USING (true);

-- 4. Allowed Users Policy (Read Only for App Users, Write might be restricted but we allow auth for now to manage settings)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON allowed_users;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON allowed_users;

CREATE POLICY "Enable all access for authenticated users" ON allowed_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
