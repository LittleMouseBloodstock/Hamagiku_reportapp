-- Reload PostgREST schema cache
-- This forces Supabase API to recognize the newly added columns.
NOTIFY pgrst, 'reload config';
