'use client';

import React from 'react';
import { DecodeScore, BaseStatus } from '@/lib/supabase';
import { COLORS, EMOJI, BASE_STATUS_NAMES } from '@/lib/constants';

interface ScoringControlsProps {
  alliance: 'RED' | 'BLUE';
  score: DecodeScore;
  onScoreChange: (field: keyof DecodeScore, value: number | boolean | BaseStatus) => void;
  disabled?: boolean;
}

export default function ScoringControls({ 
  alliance, 
  score, 
  onScoreChange,
  disabled = false,
}: ScoringControlsProps) {
  const color = alliance === 'RED' ? COLORS.RED_PRIMARY : COLORS.BLUE_PRIMARY;
  const bgColor = alliance === 'RED' ? 'bg-red-50' : 'bg-blue-50';
  const borderColor = alliance === 'RED' ? 'border-red-500' : 'border-blue-500';
  const textColor = alliance === 'RED' ? 'text-red-700' : 'text-blue-700';

  const increment = (field: keyof DecodeScore, amount: number = 1) => {
    const currentValue = score[field];
    if (typeof currentValue === 'number') {
      onScoreChange(field, Math.max(0, currentValue + amount));
    }
  };

  const decrement = (field: keyof DecodeScore, amount: number = 1) => {
    const currentValue = score[field];
    if (typeof currentValue === 'number') {
      onScoreChange(field, Math.max(0, currentValue - amount));
    }
  };

  const toggle = (field: keyof DecodeScore) => {
    const currentValue = score[field];
    if (typeof currentValue === 'boolean') {
      onScoreChange(field, !currentValue);
    }
  };

  const baseStatuses: BaseStatus[] = ['NOT_IN_BASE', 'PARTIALLY_IN_BASE', 'FULLY_IN_BASE'];

  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-4 flex-1`}>
      <h2 className={`text-xl font-bold ${textColor} mb-4`}>
        {alliance} ALLIANCE
      </h2>

      {/* AUTONOMOUS Section */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-black mb-2">
          {EMOJI.TIMER} AUTONOMOUS (30 sec)
        </h3>
        
        {/* Leave Checkboxes */}
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={score.robot1Leave}
              onChange={() => toggle('robot1Leave')}
              disabled={disabled}
              className="w-5 h-5"
            />
            <span className="text-sm">Robot 1 LEAVE (3 pts)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={score.robot2Leave}
              onChange={() => toggle('robot2Leave')}
              disabled={disabled}
              className="w-5 h-5"
            />
            <span className="text-sm">Robot 2 LEAVE (3 pts)</span>
          </label>
        </div>

        {/* Auto Scoring */}
        <div className="grid grid-cols-2 gap-2">
          <CounterControl
            label={`${EMOJI.CLASSIFIED} CLASSIFIED (3 pts)`}
            value={score.autoClassified}
            onIncrement={() => increment('autoClassified')}
            onDecrement={() => decrement('autoClassified')}
            disabled={disabled}
          />
          <CounterControl
            label={`${EMOJI.OVERFLOW} OVERFLOW (1 pt)`}
            value={score.autoOverflow}
            onIncrement={() => increment('autoOverflow')}
            onDecrement={() => decrement('autoOverflow')}
            disabled={disabled}
          />
          <CounterControl
            label={`${EMOJI.PATTERN} PATTERN (2 pts)`}
            value={score.autoPatternMatches}
            onIncrement={() => increment('autoPatternMatches')}
            onDecrement={() => decrement('autoPatternMatches')}
            disabled={disabled}
          />
        </div>
      </div>

      {/* TELEOP Section */}
      <div className="mb-4 pt-2 border-t border-gray-300">
        <h3 className="text-lg font-bold text-black mb-2">
          {EMOJI.TIMER} TELEOP (2 min)
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          <CounterControl
            label={`${EMOJI.CLASSIFIED} CLASSIFIED (3 pts)`}
            value={score.teleopClassified}
            onIncrement={() => increment('teleopClassified')}
            onDecrement={() => decrement('teleopClassified')}
            onIncrement3={() => increment('teleopClassified', 3)}
            showQuickAdd
            disabled={disabled}
          />
          <CounterControl
            label={`${EMOJI.OVERFLOW} OVERFLOW (1 pt)`}
            value={score.teleopOverflow}
            onIncrement={() => increment('teleopOverflow')}
            onDecrement={() => decrement('teleopOverflow')}
            disabled={disabled}
          />
          <CounterControl
            label="📦 DEPOT (1 pt)"
            value={score.teleopDepot}
            onIncrement={() => increment('teleopDepot')}
            onDecrement={() => decrement('teleopDepot')}
            disabled={disabled}
          />
          <CounterControl
            label={`${EMOJI.PATTERN} PATTERN (2 pts)`}
            value={score.teleopPatternMatches}
            onIncrement={() => increment('teleopPatternMatches')}
            onDecrement={() => decrement('teleopPatternMatches')}
            disabled={disabled}
          />
        </div>
      </div>

      {/* BASE Section */}
      <div className="mb-4 pt-2 border-t border-gray-300">
        <h3 className="text-lg font-bold text-black mb-2">
          {EMOJI.BASE} BASE RETURN (End Game)
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">Robot 1:</label>
            <select
              value={score.robot1Base}
              onChange={(e) => onScoreChange('robot1Base', e.target.value as BaseStatus)}
              disabled={disabled}
              className="w-full p-2 border rounded mt-1"
            >
              {baseStatuses.map((status) => (
                <option key={status} value={status}>
                  {BASE_STATUS_NAMES[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Robot 2:</label>
            <select
              value={score.robot2Base}
              onChange={(e) => onScoreChange('robot2Base', e.target.value as BaseStatus)}
              disabled={disabled}
              className="w-full p-2 border rounded mt-1"
            >
              {baseStatuses.map((status) => (
                <option key={status} value={status}>
                  {BASE_STATUS_NAMES[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PENALTIES Section */}
      <div className="pt-2 border-t border-gray-300">
        <h3 className="text-lg font-bold text-black mb-2">
          {EMOJI.FOUL} PENALTIES
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          <CounterControl
            label="Major Fouls (15 pts)"
            value={score.majorFouls}
            onIncrement={() => increment('majorFouls')}
            onDecrement={() => decrement('majorFouls')}
            disabled={disabled}
          />
          <CounterControl
            label="Minor Fouls (5 pts)"
            value={score.minorFouls}
            onIncrement={() => increment('minorFouls')}
            onDecrement={() => decrement('minorFouls')}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

// Counter Control Component
function CounterControl({
  label,
  value,
  onIncrement,
  onDecrement,
  onIncrement3,
  showQuickAdd = false,
  disabled = false,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onIncrement3?: () => void;
  showQuickAdd?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <button
          onClick={onDecrement}
          disabled={disabled || value <= 0}
          className="w-10 h-10 bg-gray-200 rounded font-bold text-xl disabled:opacity-50 active:bg-gray-300"
        >
          -
        </button>
        <span className="w-12 text-center font-bold text-lg">{value}</span>
        <button
          onClick={onIncrement}
          disabled={disabled}
          className="w-10 h-10 bg-green-500 text-white rounded font-bold text-xl disabled:opacity-50 active:bg-green-600"
        >
          +
        </button>
        {showQuickAdd && onIncrement3 && (
          <button
            onClick={onIncrement3}
            disabled={disabled}
            className="w-12 h-10 bg-blue-500 text-white rounded font-bold text-sm disabled:opacity-50 active:bg-blue-600"
          >
            +3
          </button>
        )}
      </div>
    </div>
  );
}
