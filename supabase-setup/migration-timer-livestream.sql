-- FTC Stream Scorer - Database Migration
-- Run this SQL in your Supabase SQL Editor to add new timer and livestream fields
-- Only needed if you already have an existing events table

-- Add timer state columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS timer_running BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS timer_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS timer_seconds_remaining INTEGER DEFAULT 30;
ALTER TABLE events ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS timer_paused_at TIMESTAMPTZ;

-- Add livestream URL column
ALTER TABLE events ADD COLUMN IF NOT EXISTS livestream_url TEXT DEFAULT '';
