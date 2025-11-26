# FTC Stream Scorer

**The easy-to-use scoring display for your FTC DECODE (2025-2026) matches and live streams!**

Perfect for teams streaming scrimmages, practice matches, or unofficial events.

---

## 📥 Download & Install

Native installers are automatically built for all platforms via GitHub Actions.

### Windows (Recommended)
1. **Download** the latest installer from the [Releases page](../../releases)
2. **Run** the `.msi` installer
3. **Launch** "FTC Stream Scorer" from your Start Menu

### macOS
1. **Download** the `.dmg` file from the [Releases page](../../releases)
2. **Open** the file and drag the app to your Applications folder
3. **Launch** from your Applications

### Linux
1. **Download** the `.deb` file from the [Releases page](../../releases)
2. **Install** with: `sudo dpkg -i FTCStreamScorer*.deb`
3. **Launch** from your applications menu

### Alternative: Run the JAR file (requires Java)
If installers aren't available for your platform, you can run the JAR file directly:
1. Install [Java 11 or higher](https://adoptium.net/)
2. Download `stream-scorer-1.0.0.jar` from Releases
3. Double-click the JAR file, or run: `java -jar stream-scorer-1.0.0.jar`

---

## 🎮 How to Use

### Getting Started
1. **Launch the app** - Two windows will open:
   - **Control Panel**: Where you control everything
   - **Stream Output**: The display for your stream/audience

2. **Select your webcam** (optional) from the dropdown menu

3. **Click "Start Match"** when you're ready to begin

### Scoring a Match
- Use the **Red Alliance** and **Blue Alliance** sections to track scores
- Adjust the counters for artifacts, penalties, and positions
- **Scores update automatically** on the Stream Output display

### Setting Up for Streaming (OBS)
1. In OBS, add a **Window Capture** or **Display Capture** source
2. Select the "Stream Output" window
3. Position and resize as needed
4. The overlay shows match number, timer, phase, and live scores

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📺 **Dual-Window Design** | Separate control panel and stream display |
| 🎥 **HD Webcam Integration** | 1080p @ 60fps webcam with scoring overlay |
| ⏱️ **Authentic Timing** | Official FTC match timing (30s Auto, 120s TeleOp) |
| 🔊 **Official Sounds** | Real FTC countdown and match sounds |
| 🏆 **DECODE Scoring** | Full 2025-2026 season rules built-in |
| 💾 **Works Offline** | No internet or login required |
| 🎬 **Winner Videos** | Play celebration videos with audio before final results |
| 📡 **Wireless Sync** | Multiple devices can score together |

---

## 📡 Multi-Device Scoring

Score matches with multiple devices - one person per alliance!

### ☁️ Cloud Sync (Recommended)

Works across any network - no WiFi configuration needed!

#### Step 1: Set Up Backend (One-time)

1. Create a free account at [supabase.com](https://supabase.com)
2. Run the SQL setup script from `supabase-setup/setup.sql`
3. Update the app with your Supabase credentials (see `supabase-setup/README.md`)

#### Step 2: Host Creates Event

1. **Start FTC Stream Scorer** on the main computer
2. **Click "Create Event"** in the Cloud Sync section
3. **Enter an event name** (e.g., "SCRIMMAGE_2024")
4. **Enter a password** (share this with your scorers)
5. Share the event name and password with your team

#### Step 3: Scorers Join

1. **Start FTC Stream Scorer** on each scoring device
2. **Click "Join Event"**
3. **Enter the event name and password**
4. **Select alliance** (Red or Blue)
5. Start scoring! Changes sync automatically via cloud

### 📶 Local WiFi Sync (Fallback)

If you don't have cloud sync set up, you can use local WiFi sync:

#### Setting Up the Main Computer (Server)

1. **Start FTC Stream Scorer** on your main computer
2. **Click "Start Sync Server"** in the control panel
3. **Note the connection address** shown (e.g., `192.168.1.100:5555`)
4. The server is now ready to accept connections

#### Setting Up Remote Scoring Devices (Clients)

1. **Start FTC Stream Scorer** on the remote device
2. **Connect to the server** using the IP:port from the main computer
3. **Select alliance** - choose Red or Blue alliance to score
4. Start scoring! Changes sync automatically

#### Network Requirements

- All devices must be on the **same WiFi network**
- The main computer's firewall may need to allow port 5555
- For best results, use a dedicated WiFi network

---

## 🎬 Winner Videos

When you click "Show Final Results", the app can play a celebration video before displaying the final scores.

### Setting Up Videos

1. Create your video files:
   - `red_winner.webm` or `red_winner.mp4` - plays when Red Alliance wins
   - `blue_winner.webm` or `blue_winner.mp4` - plays when Blue Alliance wins
   - `tie.webm` or `tie.mp4` - plays when scores are tied

2. Place them in: `src/main/resources/videos/`

3. Supported formats:
   - **WebM** (VP8/VP9 codec) - Recommended
   - **MP4** (H.264 codec)
   - **Resolution:** 1280x720 or 1920x1080
   - **Duration:** 5-15 seconds
   - **Audio:** Include audio track for celebration sounds! 🔊

If videos are not found, the final results will display immediately.

---

## 📹 Webcam Settings

The app automatically uses the highest quality settings supported by your webcam:

- **Target Resolution:** 1920x1080 (1080p) - falls back to best available
- **Target Frame Rate:** 60 FPS for smooth video
- **Smooth Scaling:** Enabled for better video quality

The webcam will automatically select the best supported resolution if your camera doesn't support 1080p.

---

## ❓ Troubleshooting

### "The app won't start"
- Make sure you have Java 11+ installed (for JAR version)
- Try running from command line to see error messages: `java -jar stream-scorer-1.0.0.jar`

### "My webcam isn't showing"
- Select a different webcam from the dropdown
- Make sure no other application is using the webcam
- Try unplugging and reconnecting the webcam

### "The scoring seems wrong"
- The app uses official DECODE 2025-2026 scoring rules
- Check the [DECODE Game Manual](https://firstinspires.org) for rule clarifications

### "Remote devices can't connect"
- Ensure all devices are on the same WiFi network
- Check if firewall is blocking port 5555
- Try disabling firewall temporarily for testing

---

## 🛠️ For Developers

<details>
<summary>Click to expand developer information</summary>

### Building from Source

**Requirements:**
- JDK 17+
- Maven 3.6+

**Build and run:**
```bash
mvn clean package
java -jar target/stream-scorer-1.0.0.jar
```

### Creating Installers

Platform-specific installer scripts are in the `scripts/` folder:

| Script | Description |
|--------|-------------|
| `build-windows-installer.bat` | Creates Windows .msi installer |
| `build-linux-installer.bat` | Creates Linux .deb installer (via WSL) |
| `build-macos-installer.sh` | Creates macOS .dmg installer (Mac only) |
| `build-all-installers.bat` | Menu to build all available installers |

**Requirements for building installers:**
- JDK 14+ (for jpackage)
- WSL with Ubuntu (for Linux builds on Windows)
- A Mac computer (for macOS builds)

See `scripts/github-actions-example.yml` for automated CI/CD builds.

### Project Structure

```
src/main/java/org/ftc/scorer/
├── model/           # Data models (Match, DecodeScore)
├── service/         # Services (MatchTimer, AudioService)
├── ui/              # UI Windows (ControlWindow, StreamOutputWindow)
├── webcam/          # Webcam capture service
├── ScorerApplication.java
└── Launcher.java
```

</details>

---

## 📄 License

Open source for the FIRST Tech Challenge community.

## 🙏 Credits

- Sound effects from official FTC Live Event Management System
- DECODE graphics from FIRST Inspires
- Built by [Hercules Robotics](https://herculesrobotics.engineer)
