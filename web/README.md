# FTC Stream Scorer - Web Interface

A web-based referee scoring interface for FTC DECODE (2025-2026) matches. Designed for use on iPads and tablets, allowing referees to score matches from any device with a web browser.

## Features

- 📱 **Mobile-Friendly** - Optimized for iPad and tablet use
- 🔄 **Real-Time Sync** - Scores sync automatically via Supabase cloud
- 📊 **Match Recording** - Record and view match history
- 🎯 **Accurate Display** - Matches the official FTC Stream Scorer UI
- 🌐 **Vercel Deployment** - Easy hosting with zero configuration
- 🎙️ **Audio Streaming** - Stream announcer audio to display via WebRTC
- 📹 **Video Streaming** - Stream host camera to display via WebRTC

## Quick Start

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/FTCstreamScorer&root-directory=web)

Or deploy manually:

```bash
cd web
npm install
npm run build
```

### 2. Configure Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the SQL setup script from `../supabase-setup/setup.sql`
4. Run all migration scripts in `../supabase-setup/` folder:
   - `migration-timer-livestream.sql`
   - `migration-scores-timer-sync.sql`
   - `migration-audio-streaming.sql`
   - `migration-audio-ice-candidates-display.sql`
5. Copy your project URL and anon key

### 3. Set Environment Variables

In Vercel (or `.env.local` for local development):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Usage

### For Referees (iPad/Tablet)

1. Open the web app URL in your browser
2. Enter the event name and password (provided by the host)
3. Select your alliance (Red or Blue)
4. Start scoring!

### For Event Hosts

1. Start the desktop FTC Stream Scorer app
2. Click "Create Event" and set up an event name and password
3. Share the event name and password with your referees
4. Referees join via the web interface and score from their iPads

### Display Mode

For a display-only view (e.g., on a projector):

1. Go to `/display`
2. Enter the event name
3. The display shows live scores without controls

### Host Mode (Streaming)

For hosts who want to stream video and audio:

1. Go to `/host?event=EVENT_NAME&password=PASSWORD`
2. Enable camera preview and click "Stream to Display" to stream video
3. Enable audio to stream announcer microphone to display
4. The display page will automatically receive video and audio streams

**Note:** WebRTC streaming uses STUN and TURN servers for NAT traversal. The default configuration uses public servers (Google STUN + OpenRelay TURN). For production use in restricted network environments, consider configuring your own TURN server.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home page - Join an event |
| `/score` | Referee scoring interface |
| `/display` | Display-only mode for projectors |
| `/host` | Host control panel with streaming |

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS
- **Supabase** - Real-time database & authentication
- **WebRTC** - Real-time video and audio streaming

## WebRTC Configuration

The application uses WebRTC for video and audio streaming between the host and display. The default configuration includes:

- **STUN Servers**: Google's public STUN servers for NAT traversal
- **TURN Servers**: OpenRelay (metered.ca) public TURN servers for relay when direct connections fail

The configuration is defined in `lib/constants.ts` as `WEBRTC_CONFIG`. For production deployments behind restrictive firewalls, you may need to configure your own TURN server.

## Layout Specifications

The UI matches the official FTC Stream Scorer display:

- **Canvas ratio**: 1382:776 (1.78:1)
- **Overlay height**: 16.88% of container (131px at 776px baseline)
- **Red panel color**: `#790213`
- **Blue panel color**: `#0A6CAF`
- **Side panels**: ~33% width each
- **Center panel**: ~14.5% width

## License

Open source for the FIRST Tech Challenge community.
