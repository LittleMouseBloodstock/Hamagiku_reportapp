-- Create a table for allowed users
CREATE TABLE IF NOT EXISTS allowed_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to READ the list (to check if they are allowed, or to list them in settings)
CREATE POLICY "Allow authenticated read" ON allowed_users
FOR SELECT TO authenticated
USING (true);

-- Policy: Allow authenticated users to INSERT/UPDATE/DELETE (For now, let any authenticated user manage this list. 
-- Ideally, you'd restrict this to 'admin' role, but for this 3-person team, shared access is fine)
CREATE POLICY "Allow authenticated full access" ON allowed_users
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Insert initial users (Replace with your actual emails if needed, but these are placeholders based on previous context)
-- Note: 'ON CONFLICT DO NOTHING' prevents errors if run multiple times
INSERT INTO allowed_users (email, role) VALUES 
('littlemousebloodstock@gmail.com', 'admin'),
('kaori@hamagikufarm.com', 'manager'),
('james@hamagikufarm.com', 'staff')
ON CONFLICT (email) DO NOTHING;
