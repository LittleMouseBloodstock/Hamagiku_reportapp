-- Add report output mode to clients and trainers
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS report_output_mode TEXT DEFAULT 'pdf';

ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS report_output_mode TEXT DEFAULT 'pdf';

UPDATE clients
SET report_output_mode = 'pdf'
WHERE report_output_mode IS NULL;

UPDATE trainers
SET report_output_mode = 'pdf'
WHERE report_output_mode IS NULL;
