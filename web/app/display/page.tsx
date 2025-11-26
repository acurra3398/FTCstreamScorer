'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ScoreBar from '@/components/ScoreBar';
import { 
  DecodeScore, 
  EventData, 
  SupabaseNotConfiguredError,
  DatabaseConnectionError,
  createDefaultScore, 
  extractRedScore, 
  extractBlueScore,
  fetchEvent,
  calculateTotalWithPenalties,
} from '@/lib/supabase';
import { COLORS, LAYOUT } from '@/lib/constants';

/**
 * Display page matching the live FTC Stream Scorer UI layout
 * Based on reference image (1382×776):
 * - Video area: 83.12% of height (645px at baseline)
 * - Overlay (scorebar): 16.88% of height (131px at baseline)
 * - No letterboxing - content fills full width
 * - Colors: Red #790213, Blue #0A6CAF
 */
function DisplayPageContent() {
  const searchParams = useSearchParams();
  const eventName = searchParams.get('event') || '';

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [redScore, setRedScore] = useState<DecodeScore>(createDefaultScore());
  const [blueScore, setBlueScore] = useState<DecodeScore>(createDefaultScore());
  const [eventData, setEventData] = useState<EventData | null>(null);

  // Connect to event
  useEffect(() => {
    async function connect() {
      if (!eventName) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchEvent(eventName);
        if (!data) {
          setError('Event not found');
          setIsLoading(false);
          return;
        }

        setEventData(data);
        setRedScore(extractRedScore(data));
        setBlueScore(extractBlueScore(data));
        setIsConnected(true);
        
      } catch (err) {
        if (err instanceof SupabaseNotConfiguredError) {
          setError('Database not configured. Please set up Supabase backend first.');
        } else if (err instanceof DatabaseConnectionError) {
          setError('Connection error: ' + err.message);
        } else {
          setError('Connection failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      } finally {
        setIsLoading(false);
      }
    }

    connect();
  }, [eventName]);

  // Poll for updates
  useEffect(() => {
    if (!isConnected || !eventName) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchEvent(eventName);
        if (data) {
          setEventData(data);
          setRedScore(extractRedScore(data));
          setBlueScore(extractBlueScore(data));
        }
      } catch (err) {
        console.error('Sync error:', err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isConnected, eventName]);

  // No event specified - show event entry form
  if (!eventName && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Display Mode</h1>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const event = formData.get('event') as string;
              if (event) {
                window.location.href = `/display?event=${event.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Name
              </label>
              <input
                name="event"
                type="text"
                placeholder="e.g., SCRIMMAGE_2024"
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full p-4 bg-blue-600 text-white rounded-lg font-bold text-xl"
            >
              View Scores
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Connecting to {eventName}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-red-900 text-white p-6 rounded-lg max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/display'}
            className="bg-white text-red-900 px-6 py-2 rounded font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const redTotal = calculateTotalWithPenalties(redScore, blueScore);
  const blueTotal = calculateTotalWithPenalties(blueScore, redScore);
  const matchPhase = eventData?.match_state || 'NOT_STARTED';

  // Get phase color matching live UI
  const getPhaseColor = () => {
    switch (matchPhase as string) {
      case 'ENDGAME':
      case 'END_GAME':
        return '#C86400';
      case 'FINISHED':
        return '#C80000';
      case 'UNDER_REVIEW':
        return '#967800';
      default:
        return '#007800';
    }
  };

  return (
    <div 
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{ 
        backgroundColor: COLORS.BLACK,
        // Use aspect ratio matching reference (1382:776 = 1.78:1)
        aspectRatio: '1382 / 776',
        maxHeight: '100vh',
        margin: '0 auto',
      }}
    >
      {/* Video/Content Area - 83.12% of height, NO letterboxing */}
      <div 
        className="flex w-full"
        style={{ 
          height: `${LAYOUT.VIDEO_AREA_HEIGHT_PERCENT}%`,
          // Remove any letterboxing - content fills full width
          objectFit: 'cover',
        }}
      >
        {/* Red Alliance Panel */}
        <div 
          className="flex-1 flex flex-col items-center justify-center"
          style={{ 
            backgroundColor: COLORS.RED_PRIMARY,
            // No side margins - fills to edge
            padding: '2vh 2vw',
          }}
        >
          <div 
            className="font-bold text-white mb-1"
            style={{ 
              fontSize: 'clamp(16px, 2.5vw, 32px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            RED ALLIANCE
          </div>
          <div 
            className="text-white mb-2"
            style={{ 
              fontSize: 'clamp(12px, 1.5vw, 20px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {eventData?.red_team1 || '----'} + {eventData?.red_team2 || '----'}
          </div>
          <div 
            className="font-bold text-white"
            style={{ 
              fontSize: 'clamp(80px, 15vw, 200px)',
              lineHeight: 1,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {redTotal}
          </div>
        </div>

        {/* Center Info Panel */}
        <div 
          className="flex flex-col items-center justify-center"
          style={{ 
            backgroundColor: COLORS.WHITE,
            width: '15%',
            minWidth: '150px',
            maxWidth: '220px',
            padding: '2vh 1vw',
          }}
        >
          {/* Timer */}
          <div 
            className="font-bold text-black mb-2"
            style={{ 
              fontSize: 'clamp(32px, 5vw, 72px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            --:--
          </div>
          
          {/* Phase */}
          <div 
            className="font-bold mb-1"
            style={{ 
              color: getPhaseColor(),
              fontSize: 'clamp(16px, 2vw, 28px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {matchPhase === 'NOT_STARTED' ? 'READY' : matchPhase}
          </div>
          
          {/* Motif */}
          <div 
            className="font-bold text-gray-600"
            style={{ 
              fontSize: 'clamp(12px, 1.5vw, 20px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {eventData?.motif || 'PPG'}
          </div>
          
          {/* Event Name */}
          <div 
            className="text-gray-400 mt-2"
            style={{ 
              fontSize: 'clamp(8px, 1vw, 14px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {eventName}
          </div>
        </div>

        {/* Blue Alliance Panel */}
        <div 
          className="flex-1 flex flex-col items-center justify-center"
          style={{ 
            backgroundColor: COLORS.BLUE_PRIMARY,
            // No side margins - fills to edge
            padding: '2vh 2vw',
          }}
        >
          <div 
            className="font-bold text-white mb-1"
            style={{ 
              fontSize: 'clamp(16px, 2.5vw, 32px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            BLUE ALLIANCE
          </div>
          <div 
            className="text-white mb-2"
            style={{ 
              fontSize: 'clamp(12px, 1.5vw, 20px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {eventData?.blue_team1 || '----'} + {eventData?.blue_team2 || '----'}
          </div>
          <div 
            className="font-bold text-white"
            style={{ 
              fontSize: 'clamp(80px, 15vw, 200px)',
              lineHeight: 1,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {blueTotal}
          </div>
        </div>
      </div>

      {/* Bottom Score Bar - 16.88% of height (131px at 776px baseline) */}
      <div style={{ height: `${LAYOUT.OVERLAY_HEIGHT_PERCENT}%` }}>
        <ScoreBar
          redScore={redScore}
          blueScore={blueScore}
          redTeam1={eventData?.red_team1 || ''}
          redTeam2={eventData?.red_team2 || ''}
          blueTeam1={eventData?.blue_team1 || ''}
          blueTeam2={eventData?.blue_team2 || ''}
          motif={eventData?.motif || 'PPG'}
          matchPhase={eventData?.match_state || 'NOT_STARTED'}
          timeDisplay="--:--"
        />
      </div>
    </div>
  );
}

export default function DisplayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    }>
      <DisplayPageContent />
    </Suspense>
  );
}
