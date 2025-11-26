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

-- Add video streaming columns for WebRTC signaling
ALTER TABLE events ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS video_sdp_offer TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS video_sdp_answer TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS video_ice_candidates_host TEXT DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS video_ice_candidates_display TEXT DEFAULT '[]';
