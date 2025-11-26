-- FTC Stream Scorer - Database Migration for Audio Streaming
-- Run this SQL in your Supabase SQL Editor to add audio streaming support
-- This uses Supabase Realtime for WebRTC signaling

-- Add audio streaming columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS audio_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS audio_ice_candidates TEXT DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS audio_sdp_offer TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS audio_sdp_answer TEXT DEFAULT '';

-- Enable Realtime for events table (for audio signaling)
-- Note: This needs to be enabled in Supabase Dashboard > Database > Replication
-- or by running: ALTER PUBLICATION supabase_realtime ADD TABLE events;
