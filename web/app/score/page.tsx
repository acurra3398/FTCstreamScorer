'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ScoreBar from '@/components/ScoreBar';
import ScoringControls from '@/components/ScoringControls';
import MatchHistory from '@/components/MatchHistory';
import { 
  DecodeScore, 
  EventData, 
  MatchRecord,
  BaseStatus,
  createDefaultScore, 
  extractRedScore, 
  extractBlueScore,
  calculateTotalWithPenalties,
} from '@/lib/supabase';

// API helper functions - all calls go through server-side API routes
async function verifyEventPasswordAPI(eventName: string, password: string): Promise<boolean> {
  try {
    const response = await fetch('/api/events/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, password }),
    });
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

async function fetchEventAPI(eventName: string): Promise<EventData | null> {
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventName)}`);
    const result = await response.json();
    if (result.success && result.event) {
      return result.event as EventData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
}

async function updateEventScoresAPI(
  eventName: string, 
  alliance: 'RED' | 'BLUE', 
  score: Partial<DecodeScore>
): Promise<boolean> {
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventName)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alliance, score }),
    });
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error updating scores:', error);
    return false;
  }
}

async function recordMatchAPI(eventName: string, matchNumber: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventName)}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchNumber }),
    });
    const result = await response.json();
    return { success: result.success === true, message: result.message || 'Unknown error' };
  } catch (error) {
    console.error('Error recording match:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Network error' };
  }
}

async function getMatchHistoryAPI(eventName: string): Promise<MatchRecord[]> {
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventName)}/matches`);
    const result = await response.json();
    if (result.success && result.matches) {
      return result.matches as MatchRecord[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching match history:', error);
    return [];
  }
}

function ScoringPageContent() {
  const searchParams = useSearchParams();
  const eventName = searchParams.get('event') || '';
  const password = searchParams.get('password') || '';
  const alliance = (searchParams.get('alliance') || 'RED') as 'RED' | 'BLUE';

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState('');
  
  const [redScore, setRedScore] = useState<DecodeScore>(createDefaultScore());
  const [blueScore, setBlueScore] = useState<DecodeScore>(createDefaultScore());
  const [eventData, setEventData] = useState<EventData | null>(null);
  
  const [matchNumber, setMatchNumber] = useState(1);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Timer display synced from host
  const [timerDisplay, setTimerDisplay] = useState('--:--');
  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);

  // Format time as M:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate precise time remaining based on sync timestamp
  const calculatePreciseTime = (data: EventData): number => {
    let seconds = data.timer_seconds_remaining ?? 30;
    
    if (data.timer_last_sync && data.timer_running && !data.timer_paused) {
      const syncTime = new Date(data.timer_last_sync).getTime();
      const now = Date.now();
      const elapsedSinceSync = Math.floor((now - syncTime) / 1000);
      seconds = Math.max(0, seconds - elapsedSinceSync);
    }
    
    return seconds;
  };

  // Verify and connect to event
  useEffect(() => {
    async function connect() {
      if (!eventName || !password) {
        setError('Missing event name or password');
        setIsLoading(false);
        return;
      }

      try {
        // Verify password via API
        const isValid = await verifyEventPasswordAPI(eventName, password);
        if (!isValid) {
          setError('Invalid event name or password');
          setIsLoading(false);
          return;
        }

        // Fetch initial data via API
        const data = await fetchEventAPI(eventName);
        if (!data) {
          setError('Event not found');
          setIsLoading(false);
          return;
        }

        setEventData(data);
        setRedScore(extractRedScore(data));
        setBlueScore(extractBlueScore(data));
        setTimerDisplay(formatTime(calculatePreciseTime(data)));
        setCountdownDisplay(data.countdown_number ?? null);
        setIsConnected(true);
        setLastSync(new Date().toLocaleTimeString());
        
        // Load match history via API
        const history = await getMatchHistoryAPI(eventName);
        setMatchHistory(history);
        setMatchNumber(history.length + 1);
        
      } catch (err) {
        setError('Connection failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    connect();
  }, [eventName, password]);

  // Poll for updates
  useEffect(() => {
    if (!isConnected || !eventName) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchEventAPI(eventName);
        if (data) {
          setEventData(data);
          // Only update the alliance we're NOT scoring
          if (alliance === 'RED') {
            setBlueScore(extractBlueScore(data));
          } else {
            setRedScore(extractRedScore(data));
          }
          // Sync timer display from host with precise timing
          setTimerDisplay(formatTime(calculatePreciseTime(data)));
          setCountdownDisplay(data.countdown_number ?? null);
          setLastSync(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error('Sync error:', err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isConnected, eventName, alliance]);

  // Handle score change
  const handleScoreChange = useCallback(async (
    scoringAlliance: 'RED' | 'BLUE',
    field: keyof DecodeScore,
    value: number | boolean | BaseStatus
  ) => {
    // Only allow changes to our alliance
    if (scoringAlliance !== alliance) return;

    const updateFn = scoringAlliance === 'RED' ? setRedScore : setBlueScore;
    
    // Update local state immediately
    updateFn(prev => ({
      ...prev,
      [field]: value,
    }));

    // Send to server via API
    try {
      await updateEventScoresAPI(eventName, scoringAlliance, { [field]: value });
    } catch (err) {
      console.error('Failed to update score:', err);
    }
  }, [alliance, eventName]);

  // Record match
  const handleRecordMatch = async () => {
    if (!eventData) return;
    
    const result = await recordMatchAPI(eventName, matchNumber);
    if (result.success) {
      const history = await getMatchHistoryAPI(eventName);
      setMatchHistory(history);
      setMatchNumber(history.length + 1);
      alert(`Match ${matchNumber} recorded successfully!`);
    } else {
      alert(`Failed to record match: ${result.message}`);
    }
  };

  // Reset scores for new match
  const handleResetScores = async () => {
    if (!confirm('Reset all scores for a new match?')) return;
    
    const defaultScore = createDefaultScore();
    setRedScore(defaultScore);
    setBlueScore(defaultScore);
    
    // Update server via API
    await updateEventScoresAPI(eventName, 'RED', defaultScore);
    await updateEventScoresAPI(eventName, 'BLUE', defaultScore);
  };

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
        <div className="bg-red-900 text-white p-6 rounded-lg max-w-lg text-center">
          <h2 className="text-2xl font-bold mb-4">❌ Connection Error</h2>
          <p className="mb-4 text-left">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-white text-gray-900 px-6 py-2 rounded font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const redTotal = calculateTotalWithPenalties(redScore, blueScore);
  const blueTotal = calculateTotalWithPenalties(blueScore, redScore);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Score Bar - Fixed at top */}
      <div className="sticky top-0 z-50">
        <ScoreBar
          redScore={redScore}
          blueScore={blueScore}
          redTeam1={eventData?.red_team1 || ''}
          redTeam2={eventData?.red_team2 || ''}
          blueTeam1={eventData?.blue_team1 || ''}
          blueTeam2={eventData?.blue_team2 || ''}
          motif={eventData?.motif || 'PPG'}
          matchPhase={eventData?.match_state || 'NOT_STARTED'}
          timeDisplay={timerDisplay}
          countdownNumber={countdownDisplay}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span>Event: <strong>{eventName}</strong></span>
          <span>Scoring: <strong className={alliance === 'RED' ? 'text-red-400' : 'text-blue-400'}>{alliance}</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <span>Match #{matchNumber}</span>
          <span>Last sync: {lastSync}</span>
        </div>
      </div>

      {/* Scoring Controls */}
      <div className="flex-1 p-4">
        <div className="flex gap-4 flex-col lg:flex-row">
          <ScoringControls
            alliance="RED"
            score={redScore}
            onScoreChange={(field, value) => handleScoreChange('RED', field, value)}
            disabled={alliance !== 'RED'}
          />
          <ScoringControls
            alliance="BLUE"
            score={blueScore}
            onScoreChange={(field, value) => handleScoreChange('BLUE', field, value)}
            disabled={alliance !== 'BLUE'}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-gray-800 p-4 flex gap-4 justify-center">
        <button
          onClick={handleRecordMatch}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-purple-700"
        >
          📝 Record Match #{matchNumber}
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-gray-700"
        >
          📊 History ({matchHistory.length})
        </button>
        <button
          onClick={handleResetScores}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-red-700"
        >
          🔄 Reset Scores
        </button>
      </div>

      {/* Match History Modal */}
      {showHistory && (
        <MatchHistory 
          matches={matchHistory} 
          onClose={() => setShowHistory(false)} 
        />
      )}
    </div>
  );
}

export default function ScoringPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    }>
      <ScoringPageContent />
    </Suspense>
  );
}
