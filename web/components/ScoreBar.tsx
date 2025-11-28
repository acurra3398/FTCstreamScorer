'use client';

import React from 'react';
import { DecodeScore, calculateTotalWithPenalties, calculateScoreBreakdown } from '@/lib/supabase';
import { COLORS, LAYOUT, motifToEmoji } from '@/lib/constants';

interface ScoreBarProps {
  redScore: DecodeScore;
  blueScore: DecodeScore;
  redTeam1: string;
  redTeam2: string;
  blueTeam1: string;
  blueTeam2: string;
  motif: string;
  matchPhase: string;
  timeDisplay: string;
  countdownNumber?: number | null;
  transitionMessage?: string | null;
}

/**
 * ScoreBar component matching the official FTC Live Event Management System UI
 * 
 * Based on measured reference image (1326×131 px):
 * - Left red column: 44.6% width (#830F12)
 * - Center timer: 10.6% width (white #FFFFFF)
 * - Right blue column: 44.7% width (#004172)
 * - Team number boxes: 102×53 px (stacked pair)
 * - Score circle: ~85px diameter
 * - Status circles: 18px diameter, 24px spacing
 */
export default function ScoreBar({
  redScore,
  blueScore,
  redTeam1,
  redTeam2,
  blueTeam1,
  blueTeam2,
  motif,
  matchPhase,
  timeDisplay,
  countdownNumber,
}: ScoreBarProps) {
  const redTotal = calculateTotalWithPenalties(redScore, blueScore);
  const blueTotal = calculateTotalWithPenalties(blueScore, redScore);
  
  // Calculate score breakdowns for display
  const redBreakdown = calculateScoreBreakdown(redScore, blueScore);
  const blueBreakdown = calculateScoreBreakdown(blueScore, redScore);

  // Get status circle colors based on match phase
  const getStatusColors = () => {
    switch (matchPhase) {
      case 'AUTONOMOUS':
        return [COLORS.STATUS_GREEN, COLORS.STATUS_PURPLE, COLORS.STATUS_PURPLE];
      case 'TELEOP':
        return [COLORS.STATUS_GREEN, COLORS.STATUS_GREEN, COLORS.STATUS_PURPLE];
      case 'END_GAME':
        return [COLORS.STATUS_GREEN, COLORS.STATUS_GREEN, COLORS.STATUS_GREEN];
      default:
        return [COLORS.STATUS_PURPLE, COLORS.STATUS_PURPLE, COLORS.STATUS_PURPLE];
    }
  };

  const statusColors = getStatusColors();

  // Main container - aspect ratio matches official UI (1326×131)
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: 'clamp(80px, 10vh, 131px)',
    display: 'flex',
    alignItems: 'stretch',
    backgroundColor: COLORS.BLACK,
    fontFamily: 'Montserrat, "Roboto", "Helvetica Neue", Arial, sans-serif',
  };

  return (
    <div style={containerStyle}>
      {/* LEFT RED COLUMN - 44.6% width */}
      <div 
        style={{ 
          width: `${LAYOUT.LEFT_PANEL_WIDTH_PERCENT}%`,
          backgroundColor: COLORS.RED_PRIMARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          gap: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Stacked Team Number Boxes - on the left edge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          <TeamNumberBox team={redTeam1} />
          <TeamNumberBox team={redTeam2} />
        </div>
        
        {/* Score Breakdown (scattered layout) - closer to score */}
        <ScoreBreakdownDisplay breakdown={redBreakdown} alliance="RED" />
        
        {/* Large Score Circle - flex shrink 0 to maintain size */}
        <ScoreCircle score={redTotal} color={COLORS.RED_PRIMARY} />
      </div>

      {/* CENTER TIMER COLUMN - 10.6% width */}
      <div 
        style={{ 
          width: `${LAYOUT.CENTER_PANEL_WIDTH_PERCENT}%`,
          backgroundColor: COLORS.WHITE,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderLeft: `2px solid ${COLORS.TEXT_BLACK}`,
          borderRight: `2px solid ${COLORS.TEXT_BLACK}`,
        }}
      >
        {/* Countdown overlay */}
        {countdownNumber !== null && countdownNumber !== undefined && (
          <div 
            style={{ 
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              zIndex: 10,
            }}
          >
            <span 
              style={{ 
                fontSize: 'clamp(48px, 6vh, 80px)',
                fontWeight: 900,
                color: COLORS.RED_PRIMARY,
                fontFamily: 'Montserrat, Arial, sans-serif',
              }}
            >
              {countdownNumber}
            </span>
          </div>
        )}

        {/* Phase-specific Icon (above timer) */}
        <PhaseIcon matchPhase={matchPhase} />

        {/* Timer Display */}
        <div 
          style={{ 
            fontSize: 'clamp(28px, 4vh, 45px)',
            fontWeight: 900,
            color: COLORS.TEXT_BLACK,
            lineHeight: 1,
            letterSpacing: '-1px',
            fontFamily: 'Montserrat, "Roboto Black", Arial, sans-serif',
          }}
        >
          {timeDisplay}
        </div>

        {/* Status Circles (3 small colored circles below timer) */}
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          marginTop: '4px',
        }}>
          {statusColors.map((color, i) => (
            <div 
              key={i}
              style={{ 
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: color,
              }}
            />
          ))}
        </div>
        
        {/* Motif Display */}
        {motif && (
          <div style={{ 
            marginTop: '2px',
            fontSize: 'clamp(10px, 1.5vh, 16px)',
            fontWeight: 700,
            letterSpacing: '1px',
          }}>
            {motifToEmoji(motif)}
          </div>
        )}
      </div>

      {/* RIGHT BLUE COLUMN - 44.7% width */}
      <div 
        style={{ 
          width: `${LAYOUT.RIGHT_PANEL_WIDTH_PERCENT}%`,
          backgroundColor: COLORS.BLUE_PRIMARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          gap: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Large Score Circle - flex shrink 0 to maintain size */}
        <ScoreCircle score={blueTotal} color={COLORS.BLUE_PRIMARY} />
        
        {/* Score Breakdown (scattered layout) - closer to score */}
        <ScoreBreakdownDisplay breakdown={blueBreakdown} alliance="BLUE" />
        
        {/* Stacked Team Number Boxes - on the right edge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          <TeamNumberBox team={blueTeam1} />
          <TeamNumberBox team={blueTeam2} />
        </div>
      </div>
    </div>
  );
}

/**
 * Phase-specific Icon Component
 * Shows different icons based on match phase:
 * - AUTONOMOUS: Robot head
 * - TRANSITION: Hand icon
 * - TELEOP/END_GAME: Game controller icon
 * - Default: Robot head
 */
function PhaseIcon({ matchPhase }: { matchPhase: string }) {
  const iconSize = { width: '28px', height: '28px' };
  const iconStyle: React.CSSProperties = { 
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...iconSize,
  };

  // TRANSITION: Hand icon
  if (matchPhase === 'TRANSITION') {
    return (
      <div style={iconStyle}>
        <svg viewBox="0 0 24 24" fill={COLORS.TEXT_BLACK} style={{ width: '100%', height: '100%' }}>
          {/* Hand icon */}
          <path d="M18 8.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v4.5h-1V5.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v7.5h-1V6.5c0-.83-.67-1.5-1.5-1.5S7 5.67 7 6.5v8.5H6V9.5C6 8.67 5.33 8 4.5 8S3 8.67 3 9.5v6c0 3.87 3.13 7 7 7h3c3.31 0 6-2.69 6-6v-8h-1z"/>
        </svg>
      </div>
    );
  }

  // TELEOP or END_GAME: Game controller icon
  if (matchPhase === 'TELEOP' || matchPhase === 'END_GAME') {
    return (
      <div style={iconStyle}>
        <svg viewBox="0 0 24 24" fill={COLORS.TEXT_BLACK} style={{ width: '100%', height: '100%' }}>
          {/* Game controller icon */}
          <path d="M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
        </svg>
      </div>
    );
  }

  // Default/AUTONOMOUS: Robot head icon
  return (
    <div style={iconStyle}>
      <svg viewBox="0 0 24 24" fill={COLORS.TEXT_BLACK} style={{ width: '100%', height: '100%' }}>
        {/* Robot head only */}
        <rect x="5" y="4" width="14" height="14" rx="3" />
        <circle cx="9" cy="10" r="2" fill={COLORS.WHITE} />
        <circle cx="15" cy="10" r="2" fill={COLORS.WHITE} />
        <rect x="8" y="14" width="8" height="2" rx="1" fill={COLORS.WHITE} />
        <rect x="10" y="1" width="4" height="3" rx="1" />
      </svg>
    </div>
  );
}

/**
 * Team Number Box - White box with dark border containing team number
 * Dimensions: 102×53 px in reference (scaled responsively)
 */
function TeamNumberBox({ team }: { team: string }) {
  const displayTeam = team || '----';
  
  return (
    <div 
      style={{ 
        width: 'clamp(70px, 8vw, 102px)',
        height: 'clamp(35px, 4vh, 53px)',
        backgroundColor: COLORS.WHITE,
        border: `${LAYOUT.BOX_STROKE_WIDTH}px solid ${COLORS.TEXT_BLACK}`,
        borderRadius: `${LAYOUT.BOX_CORNER_RADIUS}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      }}
    >
      <span 
        style={{ 
          fontSize: 'clamp(16px, 2.5vh, 32px)',
          fontWeight: 700,
          color: COLORS.TEXT_BLACK,
          fontFamily: 'Montserrat, "Roboto", Arial, sans-serif',
        }}
      >
        {displayTeam}
      </span>
    </div>
  );
}

/**
 * Large Score Circle - Circular display for alliance total score
 * Diameter: ~85px in reference (scaled responsively)
 */
function ScoreCircle({ score, color }: { score: number; color: string }) {
  // Slightly lighter/darker version for contrast
  const circleColor = color;
  
  return (
    <div 
      style={{ 
        width: 'clamp(55px, 6.5vw, 85px)',
        height: 'clamp(55px, 6.5vw, 85px)',
        borderRadius: '50%',
        backgroundColor: circleColor,
        border: `3px solid ${COLORS.WHITE}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}
    >
      <span 
        style={{ 
          fontSize: 'clamp(22px, 3.5vh, 42px)',
          fontWeight: 900,
          color: COLORS.WHITE,
          fontFamily: 'Montserrat, "Roboto Black", Arial, sans-serif',
        }}
      >
        {score}
      </span>
    </div>
  );
}

/**
 * Score Breakdown Display - Scattered layout showing scoring breakdown
 * Shows: Leave, Park/Base, Classified, Overflow, Pattern, Fouls
 * Layout is scattered/spread out rather than a compact list
 */
function ScoreBreakdownDisplay({ 
  breakdown, 
  alliance 
}: { 
  breakdown: ReturnType<typeof calculateScoreBreakdown>;
  alliance: 'RED' | 'BLUE';
}) {
  // Larger font size for better visibility
  const fontSize = 'clamp(10px, 1.3vh, 14px)';
  const valueSize = 'clamp(12px, 1.5vh, 16px)';
  
  // Combine related scores for display
  const classified = breakdown.autoClassified + breakdown.teleopClassified;
  const overflow = breakdown.autoOverflow + breakdown.teleopOverflow + breakdown.teleopDepot;
  const pattern = breakdown.autoPattern + breakdown.teleopPattern;
  
  // Score item component for consistent styling
  const ScoreItem = ({ icon, value, highlight = false }: { icon: string; value: number; highlight?: boolean }) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2px 4px',
    }}>
      <span style={{ fontSize: valueSize, fontWeight: 700, color: highlight ? COLORS.PENALTY_BONUS : COLORS.WHITE }}>
        {highlight ? '+' : ''}{value}
      </span>
      <span style={{ fontSize, color: COLORS.WHITE, opacity: 0.9 }}>{icon}</span>
    </div>
  );
  
  return (
    <div 
      style={{ 
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '4px 8px',
        padding: '4px 8px',
        borderRadius: '6px',
        backgroundColor: 'rgba(0,0,0,0.15)',
        flex: '1 1 auto',
        maxWidth: 'clamp(120px, 20vw, 200px)',
      }}
    >
      <ScoreItem icon="🚗" value={breakdown.autoLeave} />
      <ScoreItem icon="🟢" value={classified} />
      <ScoreItem icon="➕" value={overflow} />
      <ScoreItem icon="✔" value={pattern} />
      <ScoreItem icon="🏠" value={breakdown.endgameBase} />
      <ScoreItem icon="⚠" value={breakdown.penaltyPoints} highlight={breakdown.penaltyPoints > 0} />
    </div>
  );
}
