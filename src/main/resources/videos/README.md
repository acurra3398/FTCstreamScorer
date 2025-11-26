# Winner Videos

Place your celebration videos in this folder:

- `red_winner.webm` or `red_winner.mp4` - Played when Red Alliance wins
- `blue_winner.webm` or `blue_winner.mp4` - Played when Blue Alliance wins
- `tie.webm` or `tie.mp4` - Played when scores are tied

## Supported Formats

- **WebM** (VP8/VP9 codec) - Recommended
- **MP4** (H.264 codec)

The application will try WebM first, then fall back to MP4 if not found.

## Requirements

- Resolution: Match your stream output resolution (e.g., 1920x1080 or 1280x720)
- Duration: Short celebratory clips work best (5-15 seconds recommended)

## Behavior

When the user clicks "Show Final Results":
1. The appropriate video plays full-screen (winner video or tie video)
2. After the video ends, the final results overlay appears
3. The winning alliance is highlighted with a "WINNER" badge (or "TIE MATCH" for ties)

If the video files are not found, the final results will be shown immediately without video playback.
