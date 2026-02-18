-- 1. Enable RLS on all tables (Security First)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repro_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE repro_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE repro_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE repro_follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_drafts ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON trainers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON trainers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON trainers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON trainers;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON trainers;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON allowed_users;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON allowed_users;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON allowed_users;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON repro_checks;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON repro_findings;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON repro_daily_snapshots;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON repro_follow_up_tasks;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON report_drafts;


-- 3. Apply Permissive Policies for Authenticated Users
--    We rely on the "allowed_users" whitelist check in the App Logic (AuthContext) 
--    to prevent unauthorized logins. Once logged in, the user has full access.

-- Reports
CREATE POLICY "Enable all for authenticated users" ON reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Horses
CREATE POLICY "Enable all for authenticated users" ON horses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clients
CREATE POLICY "Enable all for authenticated users" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trainers
CREATE POLICY "Enable all for authenticated users" ON trainers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allowed Users (Read/Write for admin features)
CREATE POLICY "Enable all for authenticated users" ON allowed_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Repro Management
CREATE POLICY "Enable all for authenticated users" ON repro_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON repro_findings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON repro_daily_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON repro_follow_up_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON report_drafts FOR ALL TO authenticated USING (true) WITH CHECK (true);
