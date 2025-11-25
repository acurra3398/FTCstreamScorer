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
