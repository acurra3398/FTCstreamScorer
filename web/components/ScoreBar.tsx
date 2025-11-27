'use client';

import React from 'react';
import { DecodeScore, calculateTotalWithPenalties } from '@/lib/supabase';
import { COLORS, LAYOUT } from '@/lib/constants';

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
  motif: _motif, // Kept for interface compatibility, not displayed in official FTC style
  matchPhase,
  timeDisplay,
  countdownNumber,
  transitionMessage,
}: ScoreBarProps) {
  const redTotal = calculateTotalWithPenalties(redScore, blueScore);
  const blueTotal = calculateTotalWithPenalties(blueScore, redScore);

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
          justifyContent: 'flex-end',
          padding: '0 15px',
          gap: '12px',
        }}
      >
        {/* Stacked Team Number Boxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <TeamNumberBox team={redTeam1} />
          <TeamNumberBox team={redTeam2} />
        </div>
        
        {/* Large Score Circle */}
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
        
        {/* Transition message overlay */}
        {transitionMessage && matchPhase === 'TRANSITION' && (
          <div 
            style={{ 
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 235, 59, 0.95)',
              zIndex: 10,
              padding: '4px',
            }}
          >
            <span 
              style={{ 
                fontSize: transitionMessage.length <= 1 ? 'clamp(48px, 6vh, 80px)' : 'clamp(8px, 1.2vh, 14px)',
                fontWeight: 900,
                color: COLORS.TEXT_BLACK,
                textAlign: 'center',
                fontFamily: 'Montserrat, Arial, sans-serif',
              }}
            >
              {transitionMessage}
            </span>
          </div>
        )}

        {/* Robot Icon (small, above timer) */}
        <div style={{ 
          width: '24px', 
          height: '36px', 
          marginBottom: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 36" fill={COLORS.TEXT_BLACK} style={{ width: '100%', height: '100%' }}>
            {/* Simple robot silhouette */}
            <rect x="4" y="0" width="16" height="8" rx="2" />
            <rect x="2" y="10" width="20" height="18" rx="2" />
            <rect x="0" y="12" width="4" height="8" rx="1" />
            <rect x="20" y="12" width="4" height="8" rx="1" />
            <rect x="6" y="30" width="4" height="6" rx="1" />
            <rect x="14" y="30" width="4" height="6" rx="1" />
          </svg>
        </div>

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
      </div>

      {/* RIGHT BLUE COLUMN - 44.7% width */}
      <div 
        style={{ 
          width: `${LAYOUT.RIGHT_PANEL_WIDTH_PERCENT}%`,
          backgroundColor: COLORS.BLUE_PRIMARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '0 15px',
          gap: '12px',
        }}
      >
        {/* Large Score Circle */}
        <ScoreCircle score={blueTotal} color={COLORS.BLUE_PRIMARY} />
        
        {/* Stacked Team Number Boxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <TeamNumberBox team={blueTeam1} />
          <TeamNumberBox team={blueTeam2} />
        </div>
      </div>
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
