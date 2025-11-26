# FTC Stream Scorer

**The easy-to-use scoring display for your FTC DECODE (2025-2026) matches and live streams!**

Perfect for teams streaming scrimmages, practice matches, or unofficial events.

---

## 📥 Download & Install

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
| 🎥 **Webcam Integration** | Show your field camera with scoring overlay |
| ⏱️ **Authentic Timing** | Official FTC match timing (30s Auto, 120s TeleOp) |
| 🔊 **Official Sounds** | Real FTC countdown and match sounds |
| 🏆 **DECODE Scoring** | Full 2025-2026 season rules built-in |
| 💾 **Works Offline** | No internet or login required |
| 🎬 **Winner Videos** | Play celebration videos before final results |
| 📡 **Wireless Sync** | Multiple devices can score together |

---

## 📡 Multi-Device Wireless Scoring

You can have multiple devices scoring different alliances and sync them to a main computer.

### Setting Up the Main Computer (Server)

1. **Start FTC Stream Scorer** on your main computer
2. **Click "Start Sync Server"** in the control panel
3. **Note the connection address** shown (e.g., `192.168.1.100:5555`)
4. The server is now ready to accept connections

### Setting Up Remote Scoring Devices (Clients)

1. **Start FTC Stream Scorer** on the remote device
2. **Connect to the server** using the IP:port from the main computer
3. **Select alliance** - choose Red or Blue alliance to score
4. Start scoring! Changes sync automatically

### Network Requirements

- All devices must be on the **same WiFi network**
- The main computer's firewall may need to allow port 5555
- For best results, use a dedicated WiFi network

---

## 🎬 Winner Videos

When you click "Show Final Results", the app can play a celebration video before displaying the final scores.

### Setting Up Winner Videos

1. Create two video files:
   - `red_winner.mp4` - plays when Red Alliance wins
   - `blue_winner.mp4` - plays when Blue Alliance wins

2. Place them in: `src/main/resources/videos/`

3. Recommended format:
   - **Format:** MP4 (H.264 codec)
   - **Resolution:** 1280x720 or 1920x1080
   - **Duration:** 5-15 seconds

If videos are not found, the final results will display immediately.

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
