# Custom Icons for FTC Stream Scorer

This directory contains icon files used in the stream output display. The following icons are currently implemented as placeholders and can be replaced with custom designs:

## Scoring Type Icons

### classified_icon.svg
- **Purpose**: Represents artifacts scored in the CLASSIFIED goal
- **Current Design**: Green circle with star shape
- **Recommended Size**: 48x48px
- **Usage**: Displayed in bottom score bar on stream output
- **Color Scheme**: Green (#4CAF50) to match successful scoring

### overflow_icon.svg
- **Purpose**: Represents artifacts scored in the OVERFLOW area
- **Current Design**: Orange box with horizontal lines
- **Recommended Size**: 48x48px
- **Usage**: Displayed in bottom score bar on stream output
- **Color Scheme**: Orange (#FF9800)

### pattern_icon.svg
- **Purpose**: Represents PATTERN matches on the ramp (based on MOTIF)
- **Current Design**: Grid pattern with purple and green squares
- **Recommended Size**: 48x48px
- **Usage**: Displayed in bottom score bar on stream output
- **Color Scheme**: Purple (#9C27B0) and Green (#4CAF50)

### leave_icon.svg
- **Purpose**: Represents robots that LEAVE the launch line during autonomous
- **Current Design**: Rocket/arrow pointing up
- **Recommended Size**: 48x48px
- **Usage**: Displayed in bottom score bar on stream output
- **Color Scheme**: Orange/Red (#FF5722)

### motif_icon.svg
- **Purpose**: Displays the current MOTIF (PPG, PGP, or GPP)
- **Current Design**: Blue square with colored circles representing pattern
- **Recommended Size**: 48x48px
- **Usage**: Displayed in bottom score bar on stream output
- **Color Scheme**: Blue (#3F51B5), Purple (#9C27B0), Green (#4CAF50)

### foul_icon.svg
- **Purpose**: Represents penalty points from opponent fouls
- **Current Design**: Yellow warning triangle with exclamation mark
- **Recommended Size**: 48x48px
- **Usage**: Displayed in bottom score bar on stream output
- **Color Scheme**: Yellow (#FFC107)

### base_icon.svg
- **Purpose**: Represents BASE return points (robots returning to base in endgame)
- **Current Design**: House/home shape in blue
- **Recommended Size**: 48x48px
- **Usage**: Displayed in bottom score bar on stream output (stacked with leave_icon)
- **Color Scheme**: Blue (#2196F3)
- **Points**: 5 pts (partial), 10 pts (full), +10 bonus if both fully in base

## How to Replace Icons

1. Create your custom **PNG or SVG** icons
   - PNG format is now fully supported alongside SVG
   - PNG recommended for photographic/complex images
   - SVG recommended for simple vector graphics and scalability
2. Name them exactly as listed above (e.g., `classified_icon.png` or `classified_icon.svg`)
3. Ensure dimensions are 48x48 pixels or maintain aspect ratio
4. Place your custom icons in this directory (src/main/resources/images/)
5. The application will automatically load PNG files first, then fall back to SVG
6. Rebuild the application: `mvn clean package`

**Supported formats:**
- `.png` - Portable Network Graphics (checked first)
- `.svg` - Scalable Vector Graphics (checked second)

## Design Guidelines

- Use clear, simple designs that are recognizable at small sizes
- Consider the FTC DECODE game theme and colors
- Ensure sufficient contrast for visibility on red/blue backgrounds
- SVG format is preferred for crisp rendering at any scale
- Include transparency where appropriate

## Additional Icons Needed (Future)

If you want to add more visual elements, consider creating icons for:
- Solo Mode indicator
- Alliance indicators
- Robot positioning icons
- Base return status
- Match state indicators

## Color Palette Reference

- Red Alliance: #D32F2F
- Blue Alliance: #1976D2
- Success/Green: #4CAF50
- Warning/Orange: #FF9800
- Purple (DECODE): #9C27B0
- Background Dark: #212121
- Background Light: #F5F5F5
