-- FTC Stream Scorer - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor to set up the cloud sync backend

-- Table for storing events (matches)
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    event_name TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    host_device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Match state
    motif TEXT DEFAULT 'PPG',
    match_state TEXT DEFAULT 'NOT_STARTED',
    
    -- Team info
    red_team1 TEXT DEFAULT '',
    red_team2 TEXT DEFAULT '',
    blue_team1 TEXT DEFAULT '',
    blue_team2 TEXT DEFAULT '',
    
    -- Red Alliance scores
    red_auto_classified INTEGER DEFAULT 0,
    red_auto_overflow INTEGER DEFAULT 0,
    red_auto_pattern INTEGER DEFAULT 0,
    red_teleop_classified INTEGER DEFAULT 0,
    red_teleop_overflow INTEGER DEFAULT 0,
    red_teleop_depot INTEGER DEFAULT 0,
    red_teleop_pattern INTEGER DEFAULT 0,
    red_robot1_leave BOOLEAN DEFAULT FALSE,
    red_robot2_leave BOOLEAN DEFAULT FALSE,
    red_robot1_base TEXT DEFAULT 'NOT_IN_BASE',
    red_robot2_base TEXT DEFAULT 'NOT_IN_BASE',
    red_major_fouls INTEGER DEFAULT 0,
    red_minor_fouls INTEGER DEFAULT 0,
    
    -- Blue Alliance scores
    blue_auto_classified INTEGER DEFAULT 0,
    blue_auto_overflow INTEGER DEFAULT 0,
    blue_auto_pattern INTEGER DEFAULT 0,
    blue_teleop_classified INTEGER DEFAULT 0,
    blue_teleop_overflow INTEGER DEFAULT 0,
    blue_teleop_depot INTEGER DEFAULT 0,
    blue_teleop_pattern INTEGER DEFAULT 0,
    blue_robot1_leave BOOLEAN DEFAULT FALSE,
    blue_robot2_leave BOOLEAN DEFAULT FALSE,
    blue_robot1_base TEXT DEFAULT 'NOT_IN_BASE',
    blue_robot2_base TEXT DEFAULT 'NOT_IN_BASE',
    blue_major_fouls INTEGER DEFAULT 0,
    blue_minor_fouls INTEGER DEFAULT 0,
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking connected devices
CREATE TABLE IF NOT EXISTS connected_devices (
    id BIGSERIAL PRIMARY KEY,
    event_name TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_role TEXT NOT NULL, -- 'HOST', 'RED_SCORER', 'BLUE_SCORER'
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_name, device_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_devices_event ON connected_devices(event_name);
CREATE INDEX IF NOT EXISTS idx_devices_seen ON connected_devices(last_seen);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_devices ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (needed for the app)
-- Anyone can read events (they need password to actually use it)
CREATE POLICY "Allow anonymous read" ON events
    FOR SELECT USING (true);

-- Anyone can insert new events
CREATE POLICY "Allow anonymous insert" ON events
    FOR INSERT WITH CHECK (true);

-- Anyone can update events
CREATE POLICY "Allow anonymous update" ON events
    FOR UPDATE USING (true);

-- Connected devices policies
CREATE POLICY "Allow anonymous read devices" ON connected_devices
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert devices" ON connected_devices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update devices" ON connected_devices
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete devices" ON connected_devices
    FOR DELETE USING (true);

-- Function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Clean up old events (older than 24 hours) - optional scheduled job
-- You can set this up in Supabase Dashboard > Database > Scheduled Jobs
-- DELETE FROM events WHERE created_at < NOW() - INTERVAL '24 hours';
-- DELETE FROM connected_devices WHERE last_seen < NOW() - INTERVAL '1 hour';

-- Grant permissions
GRANT ALL ON events TO anon;
GRANT ALL ON connected_devices TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
