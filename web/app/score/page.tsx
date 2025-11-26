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
  SupabaseNotConfiguredError,
  DatabaseConnectionError,
  ForbiddenApiKeyError,
  createDefaultScore, 
  extractRedScore, 
  extractBlueScore,
  fetchEvent,
  updateEventScores,
  verifyEventPassword,
  recordMatch,
  getMatchHistory,
  calculateTotalWithPenalties,
} from '@/lib/supabase';
import { MOTIF_NAMES } from '@/lib/constants';

function ScoringPageContent() {
  const searchParams = useSearchParams();
  const eventName = searchParams.get('event') || '';
  const password = searchParams.get('password') || '';
  const alliance = (searchParams.get('alliance') || 'RED') as 'RED' | 'BLUE';

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'connection' | 'configuration'>('connection');
  const [lastSync, setLastSync] = useState('');
  
  const [redScore, setRedScore] = useState<DecodeScore>(createDefaultScore());
  const [blueScore, setBlueScore] = useState<DecodeScore>(createDefaultScore());
  const [eventData, setEventData] = useState<EventData | null>(null);
  
  const [matchNumber, setMatchNumber] = useState(1);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Verify and connect to event
  useEffect(() => {
    async function connect() {
      if (!eventName || !password) {
        setError('Missing event name or password');
        setIsLoading(false);
        return;
      }

      try {
        // Verify password
        const isValid = await verifyEventPassword(eventName, password);
        if (!isValid) {
          setError('Invalid event name or password');
          setIsLoading(false);
          return;
        }

        // Fetch initial data
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
        setLastSync(new Date().toLocaleTimeString());
        
        // Load match history
        const history = await getMatchHistory(eventName);
        setMatchHistory(history);
        setMatchNumber(history.length + 1);
        
      } catch (err) {
        if (err instanceof ForbiddenApiKeyError) {
          setErrorType('configuration');
          setError(
            'A secret API key is being used in the browser. ' +
            'Please check your environment configuration. Use the anon/public key for NEXT_PUBLIC_SUPABASE_ANON_KEY, ' +
            'not the service role key. Contact your administrator to fix this security issue.'
          );
        } else if (err instanceof SupabaseNotConfiguredError) {
          setErrorType('configuration');
          setError('Database not configured. Please set up Supabase backend first.');
        } else if (err instanceof DatabaseConnectionError) {
          setErrorType('connection');
          setError('Connection error: ' + err.message);
        } else if (err instanceof Error && err.message.includes('Forbidden')) {
          // Catch any other forbidden errors from Supabase directly
          setErrorType('configuration');
          setError(
            'Forbidden access detected. This usually means a service role key is being used ' +
            'instead of the anon/public key. Please check your NEXT_PUBLIC_SUPABASE_ANON_KEY configuration.'
          );
        } else {
          setErrorType('connection');
          setError('Connection failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
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
        const data = await fetchEvent(eventName);
        if (data) {
          setEventData(data);
          // Only update the alliance we're NOT scoring
          if (alliance === 'RED') {
            setBlueScore(extractBlueScore(data));
          } else {
            setRedScore(extractRedScore(data));
          }
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

    // Send to server
    try {
      await updateEventScores(eventName, scoringAlliance, { [field]: value });
    } catch (err) {
      console.error('Failed to update score:', err);
    }
  }, [alliance, eventName]);

  // Record match
  const handleRecordMatch = async () => {
    if (!eventData) return;
    
    const success = await recordMatch(eventName, matchNumber, eventData);
    if (success) {
      const history = await getMatchHistory(eventName);
      setMatchHistory(history);
      setMatchNumber(history.length + 1);
      alert(`Match ${matchNumber} recorded successfully!`);
    } else {
      alert('Failed to record match');
    }
  };

  // Reset scores for new match
  const handleResetScores = async () => {
    if (!confirm('Reset all scores for a new match?')) return;
    
    const defaultScore = createDefaultScore();
    setRedScore(defaultScore);
    setBlueScore(defaultScore);
    
    // Update server
    await updateEventScores(eventName, 'RED', defaultScore);
    await updateEventScores(eventName, 'BLUE', defaultScore);
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
    const getErrorTitle = () => {
      switch (errorType) {
        case 'configuration':
          return '⚠️ Configuration Error';
        default:
          return '❌ Connection Error';
      }
    };

    const getErrorColor = () => {
      switch (errorType) {
        case 'configuration':
          return 'bg-orange-800';
        default:
          return 'bg-red-900';
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className={`${getErrorColor()} text-white p-6 rounded-lg max-w-lg text-center`}>
          <h2 className="text-2xl font-bold mb-4">{getErrorTitle()}</h2>
          <p className="mb-4 text-left">{error}</p>
          {errorType === 'configuration' && (
            <div className="bg-black/30 p-3 rounded text-sm text-left mb-4">
              <p className="font-bold mb-2">How to fix:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to your Supabase project dashboard</li>
                <li>Navigate to Project Settings → API</li>
                <li>Copy the <strong>anon (public)</strong> key</li>
                <li>Set it as NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                <li>Redeploy your application</li>
              </ol>
            </div>
          )}
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
          timeDisplay="--:--"
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
