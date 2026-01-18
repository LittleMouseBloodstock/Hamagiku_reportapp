-- 1. Ensure horse_id column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'horse_id'
    ) THEN 
        ALTER TABLE "reports" ADD COLUMN "horse_id" UUID;
    END IF; 
END $$;

-- 2. Ensure Foreign Key
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

-- 3. Force Link to newest horse (Since column was likely missing, all data is null)
UPDATE "reports"
SET "horse_id" = (
    SELECT "id" 
    FROM "horses" 
    ORDER BY "created_at" DESC 
    LIMIT 1
)
WHERE "horse_id" IS NULL;

-- 4. Verify RLS
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON "reports";
CREATE POLICY "Enable read access for all users" ON "reports" FOR SELECT USING (true);
