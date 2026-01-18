-- 1. Create the bucket (safe insert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-assets', 'report-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts (and allow clean re-run)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- 3. Create Policies (Do NOT run ALTER TABLE ... ENABLE RLS, as it requires ownership)

-- Allow public read access (for displaying images)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-assets');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to update
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'report-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'report-assets' AND auth.role() = 'authenticated');
