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

// Colors matching official FTC Live Event Management System UI (measured from actual image)
export const COLORS = {
  // Primary panel colors (measured from actual FTC UI - 1326×131 reference image)
  RED_PRIMARY: '#830F12',      // RGB(131,15,18) - Official FTC red
  RED_DARK: '#6a0c0f',
  BLUE_PRIMARY: '#004172',     // RGB(0,65,114) - Official FTC blue
  BLUE_DARK: '#003560',
  
  // Neutral colors
  WHITE: '#FFFFFF',
  OFF_WHITE: '#F5F5F5',        // Pale background for subtle contrast
  BLACK: '#000000',
  TEXT_BLACK: '#121212',       // Used for scores and timer digits
  PLACEHOLDER_GRAY: '#8A8A8C', // Placeholder gray from reference
  
  // Status indicator colors (measured from actual UI)
  STATUS_GREEN: '#53B250',     // Green status circles
  STATUS_PURPLE: '#7D4CB2',    // Purple status circles
  
  // Accent colors
  YELLOW: 'rgb(255, 235, 59)',
  GOLD: 'gold',
  
  // Score-related colors
  PENALTY_BONUS: '#4ade80',    // Green for points from opponent fouls
};

// Layout constants based on official FTC reference image (1326×131 baseline)
export const LAYOUT = {
  // Baseline canvas dimensions (measured from actual FTC UI)
  BASELINE_WIDTH: 1326,
  BASELINE_HEIGHT: 131,
  
  // Three-column proportions (measured from actual image)
  LEFT_PANEL_WIDTH_PERCENT: 44.6,   // Red column: 591px / 1326px ≈ 44.6%
  CENTER_PANEL_WIDTH_PERCENT: 10.6, // Timer column: 140px / 1326px ≈ 10.6%
  RIGHT_PANEL_WIDTH_PERCENT: 44.7,  // Blue column: 592px / 1326px ≈ 44.7%
  
  // Team number box dimensions (measured)
  TEAM_BOX_WIDTH: 102,   // 102px width
  TEAM_BOX_HEIGHT: 53,   // 53px height each (stacked pair)
  
  // Large score circle dimensions
  SCORE_CIRCLE_DIAMETER: 85, // ~80-90px diameter
  
  // Timer digit dimensions
  TIMER_DIGIT_HEIGHT: 45, // 45px height for timer digits
  
  // Small status circle dimensions
  STATUS_CIRCLE_DIAMETER: 18, // 18px diameter
  STATUS_CIRCLE_SPACING: 24,  // 24px center-to-center
  
  // Robot icon dimensions
  ROBOT_ICON_WIDTH: 30,
  ROBOT_ICON_HEIGHT: 45,
  
  // Corner radius for boxes
  BOX_CORNER_RADIUS: 4,
  
  // Stroke widths
  BOX_STROKE_WIDTH: 2,   // 2-3px for white boxes
  THIN_STROKE_WIDTH: 1,  // 1-2px for small widgets
  
  // Internal padding
  EDGE_PADDING: 15,      // 12-18px from outer edge
  
  // Legacy values for backward compatibility
  OVERLAY_HEIGHT_PERCENT: 16.88,    // 131px / 776px = 16.88%
  VIDEO_AREA_HEIGHT_PERCENT: 83.12, // 645px / 776px = 83.12%
  SIDE_PANEL_WIDTH_PERCENT: 44.6,   // Updated to match measured value
  CENTER_PANEL_WIDTH_PERCENT_LEGACY: 10.6,
  
  // Font sizes
  TIMER_FONT_SIZE_PERCENT: 60,
  SMALL_TEXT_PERCENT: 35,
  ICON_TEXT_PERCENT: 25,
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
  ENDGAME_START: 100,       // End game starts at 100 seconds into teleop (20 sec remaining)
  TOTAL_DURATION: 158,      // Total match time (AUTO + TRANSITION + TELEOP): 30 + 8 + 120 = 158 seconds
  INITIAL_DISPLAY_TIME: 150, // Initial timer display (AUTO + TELEOP): 30 + 120 = 150 seconds (2:30)
  COUNTDOWN_NUMBERS: [3, 2, 1] as readonly number[], // Pre-match countdown sequence
  COUNTDOWN_INTERVAL_MS: 1000, // Countdown interval in milliseconds
  TRANSITION_COUNTDOWN_START: 3, // Seconds remaining in transition to show countdown (3, 2, 1)
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

// Motif emoji display - converts P to 🟣 and G to 🟢
export function motifToEmoji(motif: string): string {
  if (!motif || typeof motif !== 'string') return '';
  
  return motif
    .toUpperCase()
    .split('')
    .map(char => {
      if (char === 'P') return '🟣';
      if (char === 'G') return '🟢';
      return char; // Keep other characters as-is
    })
    .join('');
}

// Base status display names
export const BASE_STATUS_NAMES: Record<string, string> = {
  NOT_IN_BASE: 'Not in BASE',
  PARTIALLY_IN_BASE: 'Partially in BASE',
  FULLY_IN_BASE: 'Fully in BASE',
};

// WebRTC ICE server configuration
// Includes STUN servers for NAT traversal and TURN servers for relay fallback
export const WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: [
    // Google STUN servers (free, for NAT traversal)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // OpenRelay TURN servers (free, for relay when direct connection fails)
    // These are public TURN servers provided by metered.ca
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

// WebRTC signaling polling configuration
export const WEBRTC_POLLING = {
  MAX_ATTEMPTS: 30,        // Maximum polling attempts before timeout
  INTERVAL_MS: 1000,       // Polling interval in milliseconds
  RECONNECT_DELAY_MS: 2000, // Delay before attempting reconnection
  MAX_RECONNECT_ATTEMPTS: 5, // Maximum reconnection attempts
  CONNECTION_TIMEOUT_MS: 15000, // Timeout for WebRTC connection attempts
  ICE_DEBOUNCE_MS: 100,    // Debounce time for ICE candidate batching
};

// Audio volume configuration
export const AUDIO_VOLUMES = {
  SOUND_EFFECTS: 1.0,       // Sound effects at 100% volume (results, countdown, etc.)
  STREAM_AUDIO: 0.25,       // Stream audio at 25% volume (background for announcer audio)
};
