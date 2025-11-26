-- FTC Stream Scorer - Database Migration for Audio ICE Candidates from Display
-- Run this SQL in your Supabase SQL Editor to add the missing audio ICE candidates column
-- This enables proper WebRTC audio connection between host and display

-- Add audio_ice_candidates_display column for display's ICE candidates
ALTER TABLE events ADD COLUMN IF NOT EXISTS audio_ice_candidates_display TEXT DEFAULT '[]';
