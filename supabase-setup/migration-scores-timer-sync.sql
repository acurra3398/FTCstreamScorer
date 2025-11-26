-- FTC Stream Scorer - Database Migration for Score Submission and Timer Sync
-- Run this SQL in your Supabase SQL Editor to add the missing columns
-- This is required for proper timer synchronization and referee score submission

-- Add score submission flags for referees
ALTER TABLE events ADD COLUMN IF NOT EXISTS red_scores_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS blue_scores_submitted BOOLEAN DEFAULT FALSE;

-- Add timer sync timestamp for precise timer synchronization
ALTER TABLE events ADD COLUMN IF NOT EXISTS timer_last_sync TIMESTAMPTZ;

-- Add countdown number for pre-match countdown display (5, 4, 3, 2, 1)
ALTER TABLE events ADD COLUMN IF NOT EXISTS countdown_number INTEGER;
