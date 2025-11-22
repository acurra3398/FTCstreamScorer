# FTC DECODE Scoring Rules

This document outlines the scoring system implemented in the FTC Stream Scorer application.

## Match Types

### Traditional Match (2v2)
- Two alliances (Red and Blue)
- Each alliance has 2 robots
- Head-to-head competition
- Penalties affect opponent's score

### Single Team Demo Mode
- One team showcasing their robot
- Same scoring rules as traditional match
- No opponent alliance
- Perfect for practice, demonstrations, and robot showcases

## Match Phases

### Autonomous Period (30 seconds)
Robots operate without driver control.

### TeleOp Period (120 seconds)
- 90 seconds of general TeleOp
- Last 30 seconds is "End Game" period (announced by sound effect)

## Scoring Elements

### Artifacts
Three types of artifacts in the DECODE game:
- **Green Artifacts** - Correctly classified for points
- **Purple Artifacts** - Correctly classified for points  
- **White Artifacts** - Neutral artifacts

### Scoring Areas
1. **Classifier** - 3 bins for sorting artifacts by color
2. **Overflow** - Area for unsorted artifacts
3. **Depot** - TeleOp-only scoring area

### Robot Positioning (End of Period)
Robots can park in designated zones:
- **Base Low** - Lower level of base
- **Base High** - Upper level of base
- **Gate** - Highest scoring position

## Point Values

### Autonomous Period

| Action | Points |
|--------|--------|
| Classified Artifact (Green/Purple) | 6 |
| Overflow Artifact | 2 |
| Classifier State (per correctly placed) | 6 |
| Robot in Base Low | 3 |
| Robot in Base High | 6 |
| Robot in Gate | 10 |

### TeleOp Period

| Action | Points |
|--------|--------|
| Classified Artifact (Green/Purple) | 3 |
| Overflow Artifact | 1 |
| Depot Artifact | 2 |
| Classifier State (per correctly placed) | 3 |
| Robot in Base Low | 2 |
| Robot in Base High | 4 |
| Robot in Gate | 6 |

### Penalties

| Penalty | Effect |
|---------|--------|
| Minor Foul | +5 points to opponent |
| Major Foul | +15 points to opponent |

**Note:** Penalties cannot reduce a team's score below zero.

## Classifier State Scoring

The Classifier has 3 bins. Points are awarded for artifacts correctly placed in their designated bins at the end of each period:
- **Autonomous:** 6 points per correctly placed artifact
- **TeleOp:** 3 points per correctly placed artifact

## Match Timing

- **Total Match Time:** 2 minutes 30 seconds
- **Autonomous:** 0:00 - 0:30 (30 seconds)
- **TeleOp:** 0:30 - 2:30 (120 seconds)
  - **End Game:** 2:00 - 2:30 (last 30 seconds)

### Sound Effects
The application plays authentic FTC sound effects:
- **Match Start:** 3-2-1 countdown
- **End of Auto:** Transition sound
- **End Game Start:** Charge sound (at 2:00)
- **Match End:** End match sound
- **Results:** Results display sound

## Implementation Notes

### Single Team Demo Mode
When operating in Single Team Mode:
- Only one alliance scoring panel is shown
- No penalties from opponents
- Same point values and rules apply
- Useful for:
  - Robot demonstrations
  - Practice runs
  - Tournament showcases
  - Testing and calibration

### Scoring Verification
All scores are calculated in real-time and displayed on both:
1. **Control Panel** - For the scorekeeper
2. **Stream Output** - For broadcast/OBS capture

### Maximum Theoretical Score
Per alliance (perfect scenario):
- **Autonomous:** ~100+ points (with perfect artifact placement and positioning)
- **TeleOp:** ~200+ points (with continuous scoring and positioning)
- **Total Potential:** 300+ points per alliance

## Game Strategy Tips

### High-Value Actions (for demo/showcase)
1. **Autonomous:** Focus on classified artifacts (6 pts each) and Gate positioning (10 pts)
2. **TeleOp:** Balance between classified artifacts (3 pts) and depot artifacts (2 pts)
3. **End Game:** Ensure robots reach highest position possible (Gate = 6 pts)

### Common Scoring Patterns
- **Auto Strategy:** 3 classified artifacts + Gate = 28 points
- **TeleOp Strategy:** 10 classified + 5 depot + 2 Gates = 52 points
- **Full Match:** Achievable score range 50-150 points for competitive robots

## Using the Scorer

### For Traditional Matches
1. Set Match Number (e.g., "Q15" for Qualification 15)
2. Select match type: "Traditional Match"
3. Start match when field is ready
4. Score both Red and Blue alliances
5. Penalties automatically adjust opponent scores

### For Single Team Demos
1. Set Match Number or Team Number (e.g., "Team 23333")
2. Select match type: "Single Team Demo"
3. Choose which alliance (Red or Blue) to score
4. Start match when ready
5. Score normally - opponent panel is hidden

## References

This scoring system is designed to follow FTC DECODE game rules as documented in:
- FTC Game Manual Part 1 (General Rules)
- FTC Game Manual Part 2 (DECODE-specific Rules)

**Note:** Always refer to the official FTC Game Manuals for authoritative scoring rules. This implementation is designed for local scoring and demonstrations.

## Version

- **Application Version:** 1.0.0
- **Game:** FTC DECODE
- **Season:** 2025-2026
- **Last Updated:** 2025-11-22
