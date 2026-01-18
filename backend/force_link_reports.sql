-- Link all orphaned reports (where horse_id is NULL) to Hamagiku Vega
-- This assumes Hamagiku Vega exists in the horses table.

UPDATE "reports"
SET "horse_id" = (
    SELECT "id" 
    FROM "horses" 
    WHERE "name" LIKE '%Hamagiku%' OR "name_en" LIKE '%Hamagiku%' 
    LIMIT 1
)
WHERE "horse_id" IS NULL;
