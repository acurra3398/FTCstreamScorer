-- Migration: Add password_plain column for admin convenience
-- This column stores the plaintext password so admins can share it with referees
-- The password_hash column is still used for actual authentication

-- Add the password_plain column if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS password_plain TEXT DEFAULT '';

-- Add show_camera_override column for controlling display after results
ALTER TABLE events ADD COLUMN IF NOT EXISTS show_camera_override BOOLEAN DEFAULT FALSE;
