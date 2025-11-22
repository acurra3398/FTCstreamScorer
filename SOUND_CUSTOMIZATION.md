# Sound Customization Guide

This guide explains how to customize the sound effects used in the FTC DECODE Scorer application.

## Current Sound Files

The application uses 5 sound files located in `src/main/resources/audio/`:

| Sound File | When It Plays | Duration | Description |
|------------|---------------|----------|-------------|
| **countdown.wav** | Match start & 3 seconds before end | ~3 sec | "3... 2... 1..." countdown |
| **endauto.wav** | End of Autonomous (30 seconds) | ~1 sec | Transition from AUTO to TELEOP |
| **charge.wav** | Start of End Game (2:00) | ~2 sec | "Charge!" or alert sound |
| **endmatch.wav** | End of match (2:30) | ~2 sec | Match finished buzzer/horn |
| **results.wav** | Manual - when breakdown shown | ~1 sec | Results display sound (MANUAL ONLY) |

## How to Customize Sounds

### Step 1: Prepare Your Custom Sound Files

**Requirements:**
- **Format:** WAV (recommended) or MP3
- **Sample Rate:** 44.1 kHz (standard)
- **Bit Depth:** 16-bit
- **Channels:** Mono or Stereo
- **Max Duration:** Keep under 5 seconds for best experience

**Tools for Converting Audio:**
- **Audacity** (Free): https://www.audacityteam.org/
- **Online Converters:** cloudconvert.com, online-audio-converter.com
- **FFmpeg Command:** `ffmpeg -i input.mp3 -ar 44100 -ac 2 output.wav`

### Step 2: Replace the Sound Files

1. Navigate to: `src/main/resources/audio/`
2. Replace any of these files with your custom versions:
   - `countdown.wav`
   - `endauto.wav`
   - `charge.wav`
   - `endmatch.wav`
   - `results.wav`

**IMPORTANT:** Keep the same filenames!

### Step 3: Rebuild the Application

```bash
mvn clean package
```

Your custom sounds will now be embedded in the JAR file.

## Detailed Sound Descriptions

### 1. countdown.wav
**When:** 
- At match start (0:00)
- At start of TeleOp (0:38 - after 8-second transition)

**Typical Content:** "Three... Two... One... Go!" or countdown beeps

**Official FTC:** Uses synthesized countdown voice

**Customization Ideas:**
- Team mascot saying countdown
- Electronic beeps (countdown timer)
- Sports arena countdown
- "Go go go!" announcement
- Silence (if you don't want countdown)

---

### 2. endauto.wav
**When:** Exactly at 30 seconds (AUTO → TELEOP transition)

**Typical Content:** Short buzzer or "End Autonomous" announcement

**Official FTC:** Short horn/buzzer sound

**Customization Ideas:**
- Air horn
- Referee whistle
- "TeleOp begins!" voice
- Simple beep

---

### 3. charge.wav
**When:** At 2:10 mark (start of End Game period - last 20 seconds)

**Typical Content:** Energetic sound, "Charge!" voice, or warning beep

**Official FTC:** Dramatic "Charge!" sound with music

**Customization Ideas:**
- Team chant
- Epic music sting
- "End Game!" or "20 seconds!" announcement
- Battle charge sound
- Urgent alarm/siren
- Silence if you don't want end game notification

---

### 4. endmatch.wav
**When:** At 2:30 (match end)

**Typical Content:** Final buzzer, air horn, or "End Match" announcement

**Official FTC:** Long buzzer/horn

**Customization Ideas:**
- Sports buzzer
- Referee whistle (long)
- "Match complete!" voice
- Goal horn from hockey

---

### 5. results.wav
**When:** Manually triggered when "Score Breakdown" button is pressed

**Typical Content:** Triumphant sound, fanfare, or results jingle

**Official FTC:** Results/scores display music

**Customization Ideas:**
- Victory fanfare
- Sports center theme
- Team celebration sound
- Award ceremony music
- Applause

## Creating Silent Sounds

If you want to disable a specific sound, create a silent WAV file:

**Using Audacity:**
1. Generate → Silence → 0.5 seconds
2. Export as WAV
3. Replace the target file

**Using FFmpeg:**
```bash
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 0.5 silent.wav
```

## Recommended Sound Sources

### Free Sound Libraries:
- **Freesound.org** - User-uploaded sounds (CC licenses)
- **Zapsplat.com** - Free sound effects
- **BBC Sound Effects** - Public domain sounds
- **YouTube Audio Library** - Royalty-free sounds

### Official FTC Sounds:
- Check FIRST Inspires resources
- May be available in FTC Game Manual downloads
- Contact FIRST for official sound files

### Record Your Own:
- Use team announcer
- Record at your events
- Team-specific sounds
- School mascot audio

## Testing Your Custom Sounds

### Method 1: Quick Test (Before Rebuilding)
1. Run the application from source:
   ```bash
   mvn javafx:run
   ```
2. Sounds are loaded from `src/main/resources/audio/`
3. Changes take effect immediately

### Method 2: Test in Built JAR
1. Build: `mvn clean package`
2. Run: `java -jar target/stream-scorer-1.0.0.jar`
3. Start a match and listen

### Method 3: Test Individual Sounds
Navigate to `src/main/resources/audio/` and play files directly with:
- **Windows:** Built-in media player
- **macOS:** `afplay countdown.wav`
- **Linux:** `aplay countdown.wav` or VLC

## Sound Timing Reference

```
Match Timeline:
0:00  ─── countdown.wav plays (match START)
      ├── AUTONOMOUS (30 seconds)
      │   
0:30  ─── endauto.wav plays (START of TRANSITION period)
      ├── TRANSITION (8 seconds - drivers pick up controllers)
      │   
0:38  ─── countdown.wav plays (START of TELEOP)
      ├── TELEOP (120 seconds total)
      │   
2:18  ─── charge.wav plays (END GAME begins - last 20 seconds)
      │   
2:38  ─── endmatch.wav plays (match ENDS)
      │
      └── results.wav plays MANUALLY when breakdown button pressed

Total Match Time: 2:38 (158 seconds)
- AUTO: 30 seconds
- TRANSITION: 8 seconds
- TELEOP: 120 seconds (including 20-second end game)
```

## Advanced: Add New Sound Events

If you want to add NEW sound events (not just replace existing ones):

### 1. Add Sound File
Place in `src/main/resources/audio/newsound.wav`

### 2. Update AudioService.java
```java
// In AudioService class, add:
private MediaPlayer newSoundPlayer;

public AudioService() {
    // Existing code...
    newSoundPlayer = loadSound("/audio/newsound.wav");
}

public void playNewSound() {
    playSound(newSoundPlayer);
}
```

### 3. Call from Your Code
```java
audioService.playNewSound();
```

### 4. Rebuild
```bash
mvn clean package
```

## Troubleshooting

### Sound Doesn't Play
- **Check format:** Must be WAV or MP3
- **Check location:** Must be in `src/main/resources/audio/`
- **Check filename:** Must match exactly (case-sensitive on Linux)
- **Check file size:** Very large files may cause delays
- **Rebuild:** Run `mvn clean package` after changes

### Sound Cuts Off
- Sound may be too long for the event
- Try shortening to 1-2 seconds for transition sounds

### Sound Too Quiet/Loud
- Use audio editing software (Audacity) to adjust volume
- Normalize audio to -3dB for consistent levels

### Distorted Sound
- Check sample rate (should be 44.1kHz)
- Check bit depth (should be 16-bit)
- Re-export from audio editor

## Example: Tournament Sound Pack

For a professional tournament setup:

1. **countdown.wav** - Official FTC countdown
2. **endauto.wav** - Short air horn
3. **charge.wav** - "End Game!" announcement
4. **endmatch.wav** - Long buzzer
5. **results.wav** - Award ceremony fanfare

Place all 5 files in `src/main/resources/audio/`, rebuild, and you're ready!

## Quick Customization Checklist

- [ ] Decide which sounds to customize
- [ ] Prepare/download sound files in WAV format
- [ ] Convert to correct format if needed (44.1kHz, 16-bit)
- [ ] Copy files to `src/main/resources/audio/`
- [ ] Keep original filenames
- [ ] Test with `mvn javafx:run`
- [ ] If good, build final JAR: `mvn clean package`
- [ ] Test final JAR
- [ ] Distribute to team

## Support

For questions about sound customization:
- Check audio file properties with: `ffprobe filename.wav`
- Test audio playback with VLC or media player
- Ensure files are not corrupted
- Report issues on GitHub

**Happy Customizing! 🔊🎵**
