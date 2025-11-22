# FTC Stream Scorer - Quick Start Guide

Get up and running with the FTC Stream Scorer in 5 minutes!

## Prerequisites

- **Java 11 or higher** - [Download here](https://adoptium.net/)
- **Webcam** (optional but recommended)
- **Windows, Mac, or Linux** operating system

## Installation

### Option 1: Simple JAR (Easiest)

1. Download `stream-scorer-1.0.0.jar` from the releases page
2. Double-click the JAR file, or run:
   ```bash
   java -jar stream-scorer-1.0.0.jar
   ```

### Option 2: Build from Source

```bash
git clone https://github.com/23333Hercules-Robotics/FTCstreamScorer.git
cd FTCstreamScorer
mvn clean package
java -jar target/stream-scorer-1.0.0.jar
```

### Option 3: Use Launch Scripts

**Linux/Mac:**
```bash
./run.sh
```

**Windows:**
```batch
run.bat
```

## First Time Setup

### 1. Application Launch

When you start the application, two windows will open:

1. **Control Panel** - This is where you'll enter scores
2. **Stream Output** - This is what you capture with OBS

### 2. Select Your Webcam

In the Control Panel:
1. Find the "Webcam:" dropdown
2. Select your camera from the list
3. The video feed will appear in the Stream Output window

### 3. Configure Match

1. Enter match number (e.g., "Q1", "SF1", "F1")
2. Position the Stream Output window for OBS capture

## Running a Match

### Starting a Match

1. Click **"Start Match"** in the Control Panel
2. Timer begins at 30 seconds (Autonomous)
3. Sound effects play automatically:
   - 3-2-1 countdown at start
   - End Auto transition sound
   - Charge sound at endgame (30s remaining)
   - End Match sound
   - Results sound

### Scoring During Match

Both Red and Blue alliances have identical controls:

**Autonomous Section:**
- Classified Artifacts: Use spinner or type number
- Overflow Artifacts: Use spinner or type number
- Robot 1/2 Position: Select from dropdown (NONE, BASE_LOW, BASE_HIGH, GATE)

**TeleOp Section:**
- Classified Artifacts: Use spinner
- Overflow Artifacts: Use spinner
- Depot Artifacts: Use spinner
- Robot 1/2 Endgame: Select position

**Penalties Section:**
- Major Fouls: Use spinner (points go to opponent)
- Minor Fouls: Use spinner (points go to opponent)

**Note:** Scores update in real-time on the Stream Output window!

### Match Controls

- **Pause** - Pause the timer (button changes to "Resume")
- **Reset** - Reset match to initial state (clears all scores)

## Setting Up OBS

### Add Stream Output to OBS

1. In OBS, click **"+"** under Sources
2. Select **"Window Capture"**
3. Name it "FTC Scorer"
4. Choose **"FTC Stream Output"** from window list
5. Click OK

### Positioning and Sizing

1. Drag and resize the source in OBS preview
2. Recommended: Full screen or picture-in-picture
3. The overlay is designed to be readable at any size

### Transparent Background Option

If you want the webcam feed separate:
1. You can capture just the overlay by:
   - Making the webcam optional
   - Using a greenscreen/chromakey
   - Overlaying scores on your own video source

## Tips for Smooth Operation

### Before the Match

✅ Test webcam and audio
✅ Position Stream Output window for OBS
✅ Enter correct match number
✅ Reset scores from previous match

### During the Match

✅ Use TAB key to navigate between fields
✅ Type numbers directly into spinners (faster)
✅ Wait for phase transitions before finalizing scores
✅ Watch the timer to know when to score endgame positions

### After the Match

✅ Verify final scores are correct
✅ Take a screenshot if needed
✅ Click Reset before next match

## Keyboard Shortcuts

Currently supported:
- **Tab** - Navigate between fields
- **Enter** - Start match (when button focused)
- **Space** - Pause/Resume (when button focused)

*More shortcuts coming in future updates!*

## Troubleshooting

### No Webcam Detected

- Check if webcam is connected
- Try restarting the application
- Check if another program is using the webcam
- Update webcam drivers

### Audio Not Playing

- Check system volume
- Check if Java has audio permissions
- Verify audio files are in the JAR (should be automatic)

### Window Not Showing

- Check if window is behind other windows
- Try minimizing and maximizing
- Click "Show Stream Window" button in Control Panel

### Scores Not Updating

- Check if fields have focus (click away and back)
- Verify spinner values are being changed
- Try clicking directly on the number in the spinner

### Application Won't Start

- Verify Java 11+ is installed: `java -version`
- Check console for error messages
- Try: `java -jar stream-scorer-1.0.0.jar` from terminal

## Getting Help

### Resources

- **README.md** - Full documentation
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **GitHub Issues** - Report bugs or request features

### Common Questions

**Q: Can I run multiple matches at once?**
A: No, it's designed for one match at a time (single field).

**Q: Can I save match history?**
A: Not yet, but it's planned for a future update.

**Q: Can I customize the overlay colors?**
A: Not currently, but themes are planned.

**Q: Does it work without a webcam?**
A: Yes! It will show a black background with the overlay.

**Q: Can I use multiple cameras?**
A: Not yet, single camera only currently.

## Match Scoring Reference

### DECODE Game (2025-2026)

**Autonomous (30 seconds):**
- Classified Artifact: 6 points
- Overflow Artifact: 2 points
- Classifier State (correct): 6 points
- Robot Base Low: 3 points
- Robot Base High: 6 points
- Robot Gate: 10 points

**TeleOp (120 seconds):**
- Classified Artifact: 3 points
- Overflow Artifact: 1 point
- Depot Artifact: 2 points
- Classifier State (correct): 3 points
- Robot Base Low: 2 points
- Robot Base High: 4 points
- Robot Gate: 6 points

**Penalties:**
- Minor Foul: 5 points (to opponent)
- Major Foul: 15 points (to opponent)

## Next Steps

1. **Practice** - Run test matches to get comfortable
2. **Customize** - Position windows for your streaming setup
3. **Stream** - Go live with professional FTC scoring!

## Support the Project

This is an open-source project for the FTC community. If you find it useful:
- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 🤝 Contribute improvements

---

**Happy Scoring! 🤖🎯**
