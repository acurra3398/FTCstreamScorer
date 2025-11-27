'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { COLORS } from '@/lib/constants';

// Slot color type - can be EMPTY, GREEN (correct), or PURPLE
type SlotColor = 'EMPTY' | 'GREEN' | 'PURPLE';

interface PatternRampProps {
  alliance: 'RED' | 'BLUE';
  motif: string; // PPG, PGP, or GPP
  onPatternMatchChange: (autoMatches: number, teleopMatches: number) => void;
  disabled?: boolean;
}

/**
 * PatternRamp component - A 12-slot ramp interface for FTC DECODE pattern scoring
 * 
 * The ramp has 12 slots arranged in a triangular pattern:
 * - Bottom row: 4 slots (positions 0-3)
 * - Second row: 3 slots (positions 4-6)
 * - Third row: 3 slots (positions 7-9)
 * - Top row: 2 slots (positions 10-11)
 * 
 * Users click to cycle through: EMPTY -> GREEN -> PURPLE -> EMPTY
 * The interface automatically calculates pattern matches based on the motif.
 */
export default function PatternRamp({
  alliance,
  motif,
  onPatternMatchChange,
  disabled = false,
}: PatternRampProps) {
  // Initialize 12 slots all empty
  const [slots, setSlots] = useState<SlotColor[]>(Array(12).fill('EMPTY'));
  
  // Border color based on alliance
  const borderColor = alliance === 'RED' ? COLORS.RED_PRIMARY : COLORS.BLUE_PRIMARY;
  const bgColor = alliance === 'RED' ? 'bg-red-50' : 'bg-blue-50';
  
  // Get expected pattern from motif (P = PURPLE, G = GREEN)
  const expectedPattern = useMemo(() => {
    const patternMap: Record<string, SlotColor[]> = {
      'PPG': ['PURPLE', 'PURPLE', 'GREEN'],
      'PGP': ['PURPLE', 'GREEN', 'PURPLE'],
      'GPP': ['GREEN', 'PURPLE', 'PURPLE'],
    };
    return patternMap[motif] || ['PURPLE', 'PURPLE', 'GREEN'];
  }, [motif]);
  
  // Calculate pattern matches whenever slots change
  useEffect(() => {
    let autoMatches = 0;
    let teleopMatches = 0;
    
    // Check each group of 3 consecutive slots for pattern match
    // Bottom row (0-3): positions 0-2, 1-3 (2 possible matches)
    // Second row (4-6): positions 4-6 (1 possible match)
    // Third row (7-9): positions 7-9 (1 possible match)
    // Top rows don't have enough for pattern
    
    // Check groups of 3 from left to right in each row
    const checkPatternMatch = (s1: SlotColor, s2: SlotColor, s3: SlotColor): boolean => {
      if (s1 === 'EMPTY' || s2 === 'EMPTY' || s3 === 'EMPTY') return false;
      return s1 === expectedPattern[0] && s2 === expectedPattern[1] && s3 === expectedPattern[2];
    };
    
    // Bottom row patterns (positions 0-2 and 1-3)
    if (checkPatternMatch(slots[0], slots[1], slots[2])) autoMatches++;
    if (checkPatternMatch(slots[1], slots[2], slots[3])) autoMatches++;
    
    // Second row pattern (positions 4-6)
    if (checkPatternMatch(slots[4], slots[5], slots[6])) teleopMatches++;
    
    // Third row pattern (positions 7-9)
    if (checkPatternMatch(slots[7], slots[8], slots[9])) teleopMatches++;
    
    onPatternMatchChange(autoMatches, teleopMatches);
  }, [slots, expectedPattern, onPatternMatchChange]);
  
  // Cycle slot color on click
  const handleSlotClick = (index: number) => {
    if (disabled) return;
    
    setSlots(prev => {
      const newSlots = [...prev];
      const current = newSlots[index];
      // Cycle: EMPTY -> GREEN -> PURPLE -> EMPTY
      if (current === 'EMPTY') newSlots[index] = 'GREEN';
      else if (current === 'GREEN') newSlots[index] = 'PURPLE';
      else newSlots[index] = 'EMPTY';
      return newSlots;
    });
  };
  
  // Clear all slots
  const handleClearAll = () => {
    if (disabled) return;
    setSlots(Array(12).fill('EMPTY'));
  };
  
  // Get slot background color
  const getSlotBgColor = (color: SlotColor): string => {
    switch (color) {
      case 'GREEN': return 'bg-green-500';
      case 'PURPLE': return 'bg-purple-600';
      default: return 'bg-gray-300';
    }
  };
  
  // Get slot emoji for display
  const getSlotEmoji = (color: SlotColor): string => {
    switch (color) {
      case 'GREEN': return '🟢';
      case 'PURPLE': return '🟣';
      default: return '⚪';
    }
  };
  
  return (
    <div className={`${bgColor} border-2 rounded-lg p-3`} style={{ borderColor }}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-sm">🎯 Pattern Ramp</h4>
        <button
          onClick={handleClearAll}
          disabled={disabled}
          className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Clear
        </button>
      </div>
      
      {/* Expected pattern display */}
      <div className="text-xs text-center mb-2 text-gray-600">
        Pattern: {expectedPattern.map((c, i) => (
          <span key={i}>{c === 'GREEN' ? '🟢' : '🟣'}</span>
        ))} ({motif})
      </div>
      
      {/* Ramp visualization - pyramid style */}
      <div className="flex flex-col items-center gap-1">
        {/* Top row - 2 slots */}
        <div className="flex gap-1">
          {[10, 11].map(i => (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              disabled={disabled}
              className={`w-8 h-8 rounded ${getSlotBgColor(slots[i])} 
                border-2 border-gray-400 flex items-center justify-center
                transition-colors hover:opacity-80 disabled:cursor-not-allowed`}
              title={`Slot ${i + 1}`}
            >
              <span className="text-sm">{getSlotEmoji(slots[i])}</span>
            </button>
          ))}
        </div>
        
        {/* Third row - 3 slots */}
        <div className="flex gap-1">
          {[7, 8, 9].map(i => (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              disabled={disabled}
              className={`w-8 h-8 rounded ${getSlotBgColor(slots[i])} 
                border-2 border-gray-400 flex items-center justify-center
                transition-colors hover:opacity-80 disabled:cursor-not-allowed`}
              title={`Slot ${i + 1}`}
            >
              <span className="text-sm">{getSlotEmoji(slots[i])}</span>
            </button>
          ))}
        </div>
        
        {/* Second row - 3 slots */}
        <div className="flex gap-1">
          {[4, 5, 6].map(i => (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              disabled={disabled}
              className={`w-8 h-8 rounded ${getSlotBgColor(slots[i])} 
                border-2 border-gray-400 flex items-center justify-center
                transition-colors hover:opacity-80 disabled:cursor-not-allowed`}
              title={`Slot ${i + 1}`}
            >
              <span className="text-sm">{getSlotEmoji(slots[i])}</span>
            </button>
          ))}
        </div>
        
        {/* Bottom row - 4 slots */}
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              disabled={disabled}
              className={`w-8 h-8 rounded ${getSlotBgColor(slots[i])} 
                border-2 border-gray-400 flex items-center justify-center
                transition-colors hover:opacity-80 disabled:cursor-not-allowed`}
              title={`Slot ${i + 1}`}
            >
              <span className="text-sm">{getSlotEmoji(slots[i])}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Click slots to cycle: ⚪ → 🟢 → 🟣 → ⚪
      </div>
    </div>
  );
}
