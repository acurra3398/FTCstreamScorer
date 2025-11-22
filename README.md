# FTC Stream Scorer

A local-only scoring system for FIRST Tech Challenge DECODE (2025-2026 season) matches with dual-window output and webcam integration.

## Features

- **Dual-Window System**
  - Control Panel: Easy-to-use scoring interface for single-person operation
  - Stream Output: OBS-compatible display with webcam feed and scoring overlay
  
- **Local Only** 
  - No login required
  - No cloud/API syncing
  - All data stored locally
  
- **DECODE Game Support**
  - Full DECODE 2025-2026 season scoring rules
  - Autonomous and TeleOp scoring
  - Robot positioning (Base Low/High, Gate)
  - Artifact classification (Green, Purple, White)
  - Penalty tracking
  
- **Match Timing**
  - Authentic FTC match timing (30s Auto, 120s TeleOp)
  - Original FTC sound effects (countdown, end auto, end match, etc.)
  - Automatic phase transitions
  
- **Webcam Integration**
  - Live webcam capture
  - Scoring overlay on video feed
  - Perfect for streaming to OBS/streaming software

## Requirements

- Java 11 or higher
- Webcam (optional but recommended)
- Maven (for building from source)

## Quick Start

### Running the Pre-built JAR

```bash
java -jar target/stream-scorer-1.0.0.jar
```

### Building from Source

```bash
mvn clean package
java -jar target/stream-scorer-1.0.0.jar
```

## Usage

1. **Start the Application**
   - The Control Panel window will open automatically
   - The Stream Output window will also open (can be repositioned for OBS capture)

2. **Select Webcam**
   - Choose your webcam from the dropdown in the Control Panel
   - The video feed will appear in the Stream Output window

3. **Configure Match**
   - Enter match number
   - Click "Start Match" to begin timing

4. **Score the Match**
   - Use the Red Alliance and Blue Alliance sections to track scores
   - Adjust spinners for artifacts, penalties, etc.
   - Select robot positions from dropdowns
   - Scores update in real-time on the Stream Output window

5. **Streaming**
   - Position the Stream Output window for OBS capture
   - Use OBS Window Capture or Screen Capture to add to your stream
   - The overlay shows:
     - Match number and timer
     - Current phase (AUTO/TELEOP/ENDGAME/FINISHED)
     - Live scores for both alliances

## Project Structure

```
src/main/java/org/ftc/scorer/
├── model/           # Data models (Match, DecodeScore)
├── service/         # Services (MatchTimer, AudioService)
├── ui/              # UI Windows (ControlWindow, StreamOutputWindow)
├── webcam/          # Webcam capture service
├── ScorerApplication.java  # Main JavaFX application
└── Launcher.java    # Entry point

src/main/resources/
├── audio/           # Sound effects from original FTC system
└── images/          # DECODE logos and graphics
```

## Building Installers

### Method 1: Using the Build Scripts (Recommended)

The project includes build scripts that create platform-specific installers without code signing:

**Linux/macOS:**
```bash
./build-installer.sh
```

**Windows:**
```batch
build-installer.bat
```

Requirements:
- JDK 14+ (for jpackage support)
- Maven

The installer will be created in `target/installer/`

### Method 2: Simple JAR Distribution

If you don't need a native installer, you can simply distribute the JAR file:

1. Build: `mvn clean package`
2. Distribute: `target/stream-scorer-1.0.0.jar`
3. Run: `java -jar stream-scorer-1.0.0.jar`

Or use the provided launcher scripts:
- **Linux/macOS:** `./run.sh`
- **Windows:** `run.bat`

## License

This project is open source and available for use by the FIRST Tech Challenge community.

## Credits

- Sound effects and timing from official FTC Live Event Management System
- DECODE season graphics from FIRST Inspires
- Built with JavaFX, Maven, and webcam-capture library
