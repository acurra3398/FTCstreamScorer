// Emoji icons for scoring elements (matching Java EmojiConfig)
export const EMOJI = {
  CLASSIFIED: '🟢',
  OVERFLOW: '➕',
  LEAVE: '🚗',
  BASE: '🏠',
  PATTERN: '✔',
  FOUL: '⚠',
  TROPHY: '🏆',
  TIMER: '⏱️',
  TEAM: '👥',
};

// Colors matching LIVE FTC Stream Scorer UI (sampled from reference image)
export const COLORS = {
  // Primary panel colors (sampled from live UI)
  RED_PRIMARY: '#790213',      // Live UI red panel
  RED_DARK: '#5a0110',
  BLUE_PRIMARY: '#0A6CAF',     // Live UI blue panel
  BLUE_DARK: '#085a94',
  
  // Neutral colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  PLACEHOLDER_GRAY: '#8A8A8C', // Placeholder gray from reference
  
  // Accent colors
  YELLOW: 'rgb(255, 235, 59)',
  GOLD: 'gold',
};

// Layout constants based on reference image (1382×776 baseline)
export const LAYOUT = {
  // Baseline canvas dimensions
  BASELINE_WIDTH: 1382,
  BASELINE_HEIGHT: 776,
  
  // Overlay (scorebar) dimensions as percentage of container
  OVERLAY_HEIGHT_PERCENT: 16.88,  // 131px / 776px = 16.88%
  VIDEO_AREA_HEIGHT_PERCENT: 83.12, // 645px / 776px = 83.12%
  
  // Panel widths as percentage of container width
  SIDE_PANEL_WIDTH_PERCENT: 33.33, // ~460px / 1382px ≈ 33%
  CENTER_PANEL_WIDTH_PERCENT: 14.5, // ~200px / 1382px ≈ 14.5%
  
  // Font sizes as percentage of overlay height
  TIMER_FONT_SIZE_PERCENT: 60,    // 78px / 131px ≈ 60%
  SMALL_TEXT_PERCENT: 35,         // 46px / 131px ≈ 35%
  ICON_TEXT_PERCENT: 25,          // smaller text for icons
  
  // Padding as percentage of overlay height
  VERTICAL_PADDING_PERCENT: 6,
  HORIZONTAL_PADDING_PERCENT: 6,
};

// Valid match states (shared between client and server)
export const VALID_MATCH_STATES = ['NOT_STARTED', 'AUTONOMOUS', 'TRANSITION', 'TELEOP', 'END_GAME', 'FINISHED', 'UNDER_REVIEW', 'SCORES_RELEASED'] as const;

// Valid motif types (shared between client and server)
export const VALID_MOTIFS = ['PPG', 'PGP', 'GPP'] as const;

// Match timing constants (FTC DECODE)
export const MATCH_TIMING = {
  AUTO_DURATION: 30,        // 30 seconds autonomous
  TRANSITION_DURATION: 8,   // 8 seconds transition (drivers pick up controllers)
  TELEOP_DURATION: 120,     // 2 minutes teleop
  ENDGAME_START: 90,        // End game starts at 90 seconds into teleop (30 sec remaining)
  TOTAL_DURATION: 158,      // Total match time: 30 + 8 + 120 = 158 seconds
  COUNTDOWN_NUMBERS: [5, 4, 3, 2, 1] as readonly number[], // Pre-match countdown sequence
  COUNTDOWN_INTERVAL_MS: 1000, // Countdown interval in milliseconds (matches countdown.wav timing)
};

// Audio file paths
export const AUDIO_FILES = {
  countdown: '/audio/countdown.wav',
  startmatch: '/audio/startmatch.mp3',
  endauto: '/audio/endauto.wav',
  transition: '/audio/transition.mp3',
  endgame: '/audio/endgame_start.mp3',
  endmatch: '/audio/endmatch.mp3',
  results: '/audio/results.wav',
};

// Video file paths for winner display
export const VIDEO_FILES = {
  redWinner: '/videos/red_winner.webm',
  blueWinner: '/videos/blue_winner.webm',
  tie: '/videos/tie.webm',
};

// Motif display names
export const MOTIF_NAMES: Record<string, string> = {
  PPG: 'PPG (Purple-Purple-Green)',
  PGP: 'PGP (Purple-Green-Purple)',
  GPP: 'GPP (Green-Purple-Purple)',
};

// Base status display names
export const BASE_STATUS_NAMES: Record<string, string> = {
  NOT_IN_BASE: 'Not in BASE',
  PARTIALLY_IN_BASE: 'Partially in BASE',
  FULLY_IN_BASE: 'Fully in BASE',
};
