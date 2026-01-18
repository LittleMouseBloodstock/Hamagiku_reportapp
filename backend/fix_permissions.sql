-- Ensure Horses and Clients are readable by everyone (or authenticated)
ALTER TABLE "horses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts (optional but safer)
DROP POLICY IF EXISTS "Enable read access for all users" ON "horses";
DROP POLICY IF EXISTS "Enable read access for all users" ON "clients";
DROP POLICY IF EXISTS "Enable read access for all users" ON "reports";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "horses";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "horses";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "clients";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "clients";

-- Create permissive read policies
CREATE POLICY "Enable read access for all users" ON "horses" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "clients" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "reports" FOR SELECT USING (true);

-- Allow Insert/Update for authenticated
CREATE POLICY "Enable insert for authenticated users" ON "horses" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON "horses" FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON "clients" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON "clients" FOR UPDATE USING (auth.role() = 'authenticated');
