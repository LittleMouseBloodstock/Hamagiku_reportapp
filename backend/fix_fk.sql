-- Add Foreign Key constraint to reports.horse_id if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'reports_horse_id_fkey'
    ) THEN 
        ALTER TABLE "reports" 
        ADD CONSTRAINT "reports_horse_id_fkey" 
        FOREIGN KEY ("horse_id") 
        REFERENCES "horses" ("id");
    END IF; 
END $$;

-- Also ensure RLS is enabled for reports
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;

-- Policy (simpler for now, public access or authenticated)
CREATE POLICY "Enable all access for authenticated users" ON "reports"
    FOR ALL USING (auth.role() = 'authenticated');
