# Cloud Sync Setup Guide

This guide helps you set up your own cloud sync backend using Supabase (free tier available).

## Why Cloud Sync?

- **Works across any network** - No need to be on the same WiFi
- **More reliable** - No firewall or port issues
- **Easy to use** - Just create an event with a password
- **Free** - Supabase free tier is plenty for this use case

## Quick Setup (5 minutes)

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click "New Project"
3. Choose a name (e.g., "ftc-scorer")
4. Set a database password (save this!)
5. Select a region close to you
6. Click "Create new project"
7. Wait for the project to be created (1-2 minutes)

### Step 2: Set Up the Database

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `setup.sql` and paste it
4. Click "Run" (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

**If you already have an existing database**, run `migration-timer-livestream.sql` instead to add the new timer and livestream fields.

### Step 3: Get Your API Credentials

1. Go to **Settings** → **API** (in left sidebar)
2. Copy these two values:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 4: Configure the App

There are two ways to use your credentials:

#### Option A: Modify the Source Code (Recommended for hosting your own)

Edit `src/main/java/org/ftc/scorer/service/CloudSyncService.java`:

```java
// Find these lines near the top:
private static final String DEFAULT_SUPABASE_URL = "https://your-project.supabase.co";
private static final String DEFAULT_SUPABASE_KEY = "your-anon-key";

// Replace with your values:
private static final String DEFAULT_SUPABASE_URL = "https://abcdefg.supabase.co";
private static final String DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6...";
```

Then rebuild the app with `mvn clean package`

#### Option B: Use Settings Dialog (Coming Soon)

A future update will add a settings dialog to enter these credentials in the app.

## Using Cloud Sync

### As the Host (Main Computer)

1. Click "Create Event" in the Cloud Sync section
2. Enter an event name (e.g., "SCRIMMAGE_2024")
3. Enter a password (share this with your scorers)
4. Click "Create"
5. Share the event name and password with your scoring team

### As a Scorer (Remote Device)

1. Click "Join Event"
2. Enter the event name (exactly as the host created it)
3. Enter the password
4. Select your alliance (Red or Blue)
5. Click "Join"
6. Start scoring! Your changes sync automatically

## Troubleshooting

### "Event not found"
- Check the event name matches exactly (it's case-insensitive but special characters matter)
- Make sure the host has created the event first

### "Incorrect password"
- Passwords are case-sensitive
- Ask the host to confirm the password

### "Connection failed"
- Check your internet connection
- Verify the Supabase URL and API key are correct
- Make sure the database tables were created (re-run setup.sql)

### Scores not syncing
- Check the "Last sync" time in the app
- Try disconnecting and reconnecting
- Check the Supabase dashboard for any errors

## Security Notes

- Event passwords are hashed (SHA-256) before storage
- Use unique passwords for each event
- Events are automatically cleaned up after 24 hours (if you set up the scheduled job)
- The anon key only allows limited access - your data is protected by Row Level Security

## Free Tier Limits

Supabase free tier includes:
- 500 MB database storage
- 2 GB bandwidth per month
- Unlimited API requests

This is more than enough for scoring events!
