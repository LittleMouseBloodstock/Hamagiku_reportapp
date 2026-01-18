-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add owner_id to horses table (linking to clients)
-- First check if the column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'horses' AND column_name = 'owner_id') THEN
        ALTER TABLE horses ADD COLUMN owner_id UUID REFERENCES clients(id);
    END IF;
END $$;

-- Enable RLS (Row Level Security) - standard practice
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (adjust policies as needed)
CREATE POLICY "Enable read access for authenticated users" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON clients FOR UPDATE USING (auth.role() = 'authenticated');

-- Reports Table Update for Peer Review
ALTER TABLE reports ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('draft', 'pending_jp_check', 'pending_en_check', 'approved')) DEFAULT 'draft';
COMMENT ON COLUMN reports.review_status IS 'Translation review status: draft, pending_jp_check, pending_en_check, approved';
