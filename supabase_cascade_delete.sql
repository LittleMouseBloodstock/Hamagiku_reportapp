-- Drop and recreate the foreign key on 'horses' table to allow Cascade Delete
-- This allows deleting a 'client' to automatically delete all their 'horses'
ALTER TABLE horses
DROP CONSTRAINT IF EXISTS horses_owner_id_fkey;

ALTER TABLE horses
ADD CONSTRAINT horses_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES clients(id)
ON DELETE CASCADE;

-- Drop and recreate the foreign key on 'reports' table to allow Cascade Delete
-- This allows deleting a 'horse' (directly or via client delete) to automatically delete all its 'reports'
ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_horse_id_fkey;

ALTER TABLE reports
ADD CONSTRAINT reports_horse_id_fkey
FOREIGN KEY (horse_id)
REFERENCES horses(id)
ON DELETE CASCADE;
