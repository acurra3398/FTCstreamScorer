-- FTC Stream Scorer - Database Migration for Transition Message
-- Run this SQL in your Supabase SQL Editor to add transition message support
-- This enables "DRIVERS PICK UP CONTROLLERS" and countdown messages during transition phase

-- Add transition_message column for transition period messages
-- Values: 'DRIVERS PICK UP CONTROLLERS', '3', '2', '1', or NULL
ALTER TABLE events ADD COLUMN IF NOT EXISTS transition_message TEXT DEFAULT NULL;

-- Update the setup.sql comment: This column stores the transition period message
-- that displays on the scorebar during the 8-second transition between
-- autonomous and teleop periods.
