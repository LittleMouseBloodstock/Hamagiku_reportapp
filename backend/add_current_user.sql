-- Add the current user to the allowed_users table
-- This prevents the "Access Denied" loop when the whitelist check is enabled.

INSERT INTO allowed_users (email, role)
VALUES ('littlemousebloodstock@gmail.com', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Verify it was added
SELECT * FROM allowed_users WHERE email = 'littlemousebloodstock@gmail.com';
