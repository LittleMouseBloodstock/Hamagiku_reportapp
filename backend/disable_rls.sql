-- Temporarily DISABLE Row Level Security to verify data visibility
-- If data appears after running this, the issue is definitely within the RLS Policies or Auth Token transmission.

ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE horses DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_users DISABLE ROW LEVEL SECURITY;

-- Note: This makes the data public to anyone with the API Key (Anon Key). 
-- We will re-enable it with correct policies once verified.
