'use client';

import React from 'react';
import { DecodeScore, calculateTotalWithPenalties, calculateBasePoints } from '@/lib/supabase';
import { EMOJI, COLORS, LAYOUT } from '@/lib/constants';

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
}

/**
 * ScoreBar component matching the live FTC Stream Scorer UI
 * Based on reference image measurements:
 * - Overlay height: 16.88% of container (131px at 776px baseline)
 * - Red panel: #790213
 * - Blue panel: #0A6CAF
 * - Side panels: ~33% width each
 * - Center panel: ~14.5% width
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
}: ScoreBarProps) {
  const redTotal = calculateTotalWithPenalties(redScore, blueScore);
  const blueTotal = calculateTotalWithPenalties(blueScore, redScore);

  // Calculate breakdown values for red
  const redClassifiedPts = (redScore.autoClassified + redScore.teleopClassified) * 3;
  const redOverflowPts = redScore.autoOverflow + redScore.teleopOverflow + redScore.teleopDepot;
  const redPatternPts = (redScore.autoPatternMatches + redScore.teleopPatternMatches) * 2;
  const redLeavePts = (redScore.robot1Leave ? 3 : 0) + (redScore.robot2Leave ? 3 : 0);
  const redBasePts = calculateBasePoints(redScore);
  const redFoulPts = blueScore.minorFouls * 5 + blueScore.majorFouls * 15;

  // Calculate breakdown values for blue
  const blueClassifiedPts = (blueScore.autoClassified + blueScore.teleopClassified) * 3;
  const blueOverflowPts = blueScore.autoOverflow + blueScore.teleopOverflow + blueScore.teleopDepot;
  const bluePatternPts = (blueScore.autoPatternMatches + blueScore.teleopPatternMatches) * 2;
  const blueLeavePts = (blueScore.robot1Leave ? 3 : 0) + (blueScore.robot2Leave ? 3 : 0);
  const blueBasePts = calculateBasePoints(blueScore);
  const blueFoulPts = redScore.minorFouls * 5 + redScore.majorFouls * 15;

  // Get phase color matching live UI
  const getPhaseColor = () => {
    switch (matchPhase) {
      case 'ENDGAME':
      case 'END_GAME':
        return '#C86400'; // Dark orange
      case 'FINISHED':
        return '#C80000'; // Dark red
      case 'UNDER_REVIEW':
        return '#967800'; // Dark yellow
      default:
        return '#007800'; // Dark green
    }
  };

  // Calculate responsive sizes based on overlay height
  // Overlay height is 16.88% of container, using CSS calc for responsiveness
  const overlayStyle: React.CSSProperties = {
    height: '131px', // Fixed height matching reference (will be made responsive with container queries)
    minHeight: '100px',
    maxHeight: '150px',
    backgroundColor: COLORS.BLACK,
    display: 'flex',
    alignItems: 'stretch',
    width: '100%',
  };

  return (
    <div style={overlayStyle}>
      {/* Red Section - Left Panel (~33% width) */}
      <div 
        className="flex items-center justify-end gap-[0.5vw] px-[1vw] py-[0.8vh]"
        style={{ 
          backgroundColor: COLORS.RED_PRIMARY,
          width: '33.33%',
          minWidth: '300px',
        }}
      >
        {/* Team Box */}
        <TeamBox 
          label="RED" 
          team1={redTeam1} 
          team2={redTeam2} 
          color={COLORS.RED_PRIMARY} 
        />

        {/* Foul Box */}
        <InfoBox icon={EMOJI.FOUL} value={redFoulPts} color={COLORS.RED_PRIMARY} />

        {/* Pattern Box */}
        <InfoBox icon={EMOJI.PATTERN} value={redPatternPts} color={COLORS.RED_PRIMARY} />

        {/* Leave + Base Stacked */}
        <StackedInfoBox
          topIcon={EMOJI.LEAVE}
          topValue={redLeavePts}
          bottomIcon={EMOJI.BASE}
          bottomValue={redBasePts}
          color={COLORS.RED_PRIMARY}
        />

        {/* Classified + Overflow Stacked */}
        <StackedInfoBox
          topIcon={EMOJI.CLASSIFIED}
          topValue={redClassifiedPts}
          bottomIcon={EMOJI.OVERFLOW}
          bottomValue={redOverflowPts}
          color={COLORS.RED_PRIMARY}
        />

        {/* Total Score */}
        <TotalScoreBox score={redTotal} color={COLORS.RED_PRIMARY} />
      </div>

      {/* Center Info Box - Timer/Phase/Motif (~14.5% width, centered) */}
      <div 
        className="flex flex-col items-center justify-center"
        style={{ 
          backgroundColor: COLORS.WHITE,
          width: '14.5%',
          minWidth: '140px',
          maxWidth: '200px',
          borderLeft: `2px solid ${COLORS.BLACK}`,
          borderRight: `2px solid ${COLORS.BLACK}`,
          padding: '0.5vh 1vw',
        }}
      >
        {/* Timer - 60% of overlay height */}
        <span 
          className="font-bold text-black leading-none"
          style={{ 
            fontSize: 'clamp(28px, 4.5vh, 78px)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {timeDisplay}
        </span>
        
        {/* Phase */}
        <span 
          className="font-bold leading-tight"
          style={{ 
            color: getPhaseColor(),
            fontSize: 'clamp(12px, 1.8vh, 24px)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {matchPhase === 'NOT_STARTED' ? 'READY' : matchPhase}
        </span>
        
        {/* Motif */}
        <span 
          className="font-bold text-gray-500 leading-tight"
          style={{ 
            fontSize: 'clamp(10px, 1.4vh, 18px)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {motif}
        </span>
      </div>

      {/* Blue Section - Right Panel (~33% width) */}
      <div 
        className="flex items-center justify-start gap-[0.5vw] px-[1vw] py-[0.8vh]"
        style={{ 
          backgroundColor: COLORS.BLUE_PRIMARY,
          width: '33.33%',
          minWidth: '300px',
        }}
      >
        {/* Total Score */}
        <TotalScoreBox score={blueTotal} color={COLORS.BLUE_PRIMARY} />

        {/* Classified + Overflow Stacked */}
        <StackedInfoBox
          topIcon={EMOJI.CLASSIFIED}
          topValue={blueClassifiedPts}
          bottomIcon={EMOJI.OVERFLOW}
          bottomValue={blueOverflowPts}
          color={COLORS.BLUE_PRIMARY}
        />

        {/* Leave + Base Stacked */}
        <StackedInfoBox
          topIcon={EMOJI.LEAVE}
          topValue={blueLeavePts}
          bottomIcon={EMOJI.BASE}
          bottomValue={blueBasePts}
          color={COLORS.BLUE_PRIMARY}
        />

        {/* Pattern Box */}
        <InfoBox icon={EMOJI.PATTERN} value={bluePatternPts} color={COLORS.BLUE_PRIMARY} />

        {/* Foul Box */}
        <InfoBox icon={EMOJI.FOUL} value={blueFoulPts} color={COLORS.BLUE_PRIMARY} />

        {/* Team Box */}
        <TeamBox 
          label="BLUE" 
          team1={blueTeam1} 
          team2={blueTeam2} 
          color={COLORS.BLUE_PRIMARY} 
        />
      </div>
    </div>
  );
}

// Team Box Component
function TeamBox({ 
  label, 
  team1, 
  team2, 
  color 
}: { 
  label: string; 
  team1: string; 
  team2: string; 
  color: string;
}) {
  const t1 = team1 || '----';
  const t2 = team2 || '----';
  
  return (
    <div 
      className="flex flex-col items-center justify-center"
      style={{ 
        backgroundColor: COLORS.WHITE,
        border: `2px solid ${color}`,
        borderRadius: '2px',
        minWidth: '60px',
        maxWidth: '80px',
        padding: '4px 6px',
      }}
    >
      <span 
        className="font-bold leading-tight"
        style={{ 
          color: color,
          fontSize: 'clamp(8px, 1vh, 12px)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {label}
      </span>
      <div 
        className="flex flex-col items-center text-black font-bold leading-tight text-center"
        style={{ 
          fontSize: 'clamp(10px, 1.2vh, 14px)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <span>{t1}</span>
        <span>{t2}</span>
      </div>
    </div>
  );
}

// Info Box Component - Single value with icon
function InfoBox({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <div 
      className="flex flex-col items-center justify-center"
      style={{ 
        backgroundColor: COLORS.WHITE,
        border: `2px solid ${color}`,
        borderRadius: '2px',
        minWidth: '50px',
        maxWidth: '70px',
        padding: '4px',
      }}
    >
      <span style={{ fontSize: 'clamp(16px, 2vh, 24px)' }}>{icon}</span>
      <span 
        className="font-bold text-black leading-tight"
        style={{ 
          fontSize: 'clamp(12px, 1.5vh, 18px)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// Stacked Info Box Component - Two values vertically stacked
function StackedInfoBox({ 
  topIcon, 
  topValue, 
  bottomIcon, 
  bottomValue, 
  color 
}: { 
  topIcon: string; 
  topValue: number; 
  bottomIcon: string; 
  bottomValue: number; 
  color: string;
}) {
  return (
    <div 
      className="flex flex-col"
      style={{ 
        border: `2px solid ${color}`,
        borderRadius: '2px',
        minWidth: '55px',
        maxWidth: '70px',
        overflow: 'hidden',
      }}
    >
      {/* Top Section */}
      <div 
        className="flex flex-col items-center justify-center"
        style={{ 
          backgroundColor: COLORS.WHITE,
          padding: '3px 4px',
        }}
      >
        <span style={{ fontSize: 'clamp(14px, 1.6vh, 20px)', lineHeight: 1 }}>{topIcon}</span>
        <span 
          className="font-bold text-black leading-none"
          style={{ 
            fontSize: 'clamp(10px, 1.2vh, 14px)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {topValue}
        </span>
      </div>
      
      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: color }}></div>
      
      {/* Bottom Section */}
      <div 
        className="flex flex-col items-center justify-center"
        style={{ 
          backgroundColor: COLORS.WHITE,
          padding: '3px 4px',
        }}
      >
        <span style={{ fontSize: 'clamp(14px, 1.6vh, 20px)', lineHeight: 1 }}>{bottomIcon}</span>
        <span 
          className="font-bold text-black leading-none"
          style={{ 
            fontSize: 'clamp(10px, 1.2vh, 14px)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {bottomValue}
        </span>
      </div>
    </div>
  );
}

// Total Score Box Component - Large score display
function TotalScoreBox({ score, color }: { score: number; color: string }) {
  return (
    <div 
      className="flex items-center justify-center"
      style={{ 
        backgroundColor: color,
        border: `3px solid ${COLORS.WHITE}`,
        borderRadius: '2px',
        minWidth: '70px',
        maxWidth: '100px',
        padding: '6px 10px',
      }}
    >
      <span 
        className="font-bold text-white leading-none"
        style={{ 
          fontSize: 'clamp(28px, 4vh, 48px)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {score}
      </span>
    </div>
  );
}
