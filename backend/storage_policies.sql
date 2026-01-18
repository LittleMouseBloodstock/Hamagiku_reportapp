-- Create the storage bucket for report assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-assets', 'report-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-assets');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their own files (or all files if admin)
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'report-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'report-assets' AND auth.role() = 'authenticated');
