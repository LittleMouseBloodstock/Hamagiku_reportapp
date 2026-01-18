-- Link all orphaned reports (where horse_id is NULL) to the MOST RECENTLY ADDED horse.
-- This is useful if the name matching failed.

UPDATE "reports"
SET "horse_id" = (
    SELECT "id" 
    FROM "horses" 
    ORDER BY "created_at" DESC 
    LIMIT 1
)
WHERE "horse_id" IS NULL;
