'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ScoreBar from '@/components/ScoreBar';
import MatchHistory from '@/components/MatchHistory';
import { 
  DecodeScore, 
  EventData, 
  MatchRecord,
  MatchState,
  MotifType,
  createDefaultScore, 
  extractRedScore, 
  extractBlueScore,
  calculateTotalWithPenalties,
} from '@/lib/supabase';
import { COLORS, MOTIF_NAMES } from '@/lib/constants';

// API helper functions
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

async function hostActionAPI(
  eventName: string, 
  password: string, 
  action: string, 
  data?: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventName)}/host`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action, data }),
    });
    const result = await response.json();
    return { success: result.success, message: result.message };
  } catch (error) {
    console.error('Error performing host action:', error);
    return { success: false, message: 'Failed to perform action' };
  }
}

function HostPageContent() {
  const searchParams = useSearchParams();
  const eventName = searchParams.get('event') || '';
  const password = searchParams.get('password') || '';

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  
  const [redScore, setRedScore] = useState<DecodeScore>(createDefaultScore());
  const [blueScore, setBlueScore] = useState<DecodeScore>(createDefaultScore());
  const [eventData, setEventData] = useState<EventData | null>(null);
  
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Team editing state
  const [redTeam1, setRedTeam1] = useState('');
  const [redTeam2, setRedTeam2] = useState('');
  const [blueTeam1, setBlueTeam1] = useState('');
  const [blueTeam2, setBlueTeam2] = useState('');

  // Verify and connect to event
  useEffect(() => {
    async function connect() {
      if (!eventName || !password) {
        setError('Missing event name or password');
        setIsLoading(false);
        return;
      }

      try {
        const isValid = await verifyEventPasswordAPI(eventName, password);
        if (!isValid) {
          setError('Invalid event name or password');
          setIsLoading(false);
          return;
        }

        const data = await fetchEventAPI(eventName);
        if (!data) {
          setError('Event not found');
          setIsLoading(false);
          return;
        }

        setEventData(data);
        setRedScore(extractRedScore(data));
        setBlueScore(extractBlueScore(data));
        setRedTeam1(data.red_team1 || '');
        setRedTeam2(data.red_team2 || '');
        setBlueTeam1(data.blue_team1 || '');
        setBlueTeam2(data.blue_team2 || '');
        setIsConnected(true);
        setLastSync(new Date().toLocaleTimeString());
        
        const history = await getMatchHistoryAPI(eventName);
        setMatchHistory(history);
        
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
          setRedScore(extractRedScore(data));
          setBlueScore(extractBlueScore(data));
          setLastSync(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error('Sync error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, eventName]);

  // Host actions
  const setMatchState = async (matchState: MatchState) => {
    const result = await hostActionAPI(eventName, password, 'setMatchState', { matchState });
    setActionStatus(result.message);
    if (result.success) {
      const data = await fetchEventAPI(eventName);
      if (data) setEventData(data);
    }
  };

  const setMotif = async (motif: MotifType) => {
    const result = await hostActionAPI(eventName, password, 'setMotif', { motif });
    setActionStatus(result.message);
    if (result.success) {
      const data = await fetchEventAPI(eventName);
      if (data) setEventData(data);
    }
  };

  const updateTeams = async () => {
    const result = await hostActionAPI(eventName, password, 'setTeams', {
      redTeam1,
      redTeam2,
      blueTeam1,
      blueTeam2,
    });
    setActionStatus(result.message);
  };

  const resetScores = async () => {
    if (!confirm('Reset all scores for a new match? This cannot be undone.')) return;
    
    const result = await hostActionAPI(eventName, password, 'resetScores');
    setActionStatus(result.message);
    if (result.success) {
      setRedScore(createDefaultScore());
      setBlueScore(createDefaultScore());
      const data = await fetchEventAPI(eventName);
      if (data) setEventData(data);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500 mx-auto mb-4"></div>
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
          <p className="mb-4">{error}</p>
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

  const matchStates: MatchState[] = ['NOT_STARTED', 'AUTONOMOUS', 'TELEOP', 'END_GAME', 'FINISHED', 'UNDER_REVIEW'];
  const motifs: MotifType[] = ['PPG', 'PGP', 'GPP'];

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
      <div className="bg-green-800 text-white px-4 py-2 flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-green-300">
            <span className="w-2 h-2 rounded-full bg-current"></span>
            HOST MODE
          </span>
          <span>Event: <strong>{eventName}</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <span>Match #{matchHistory.length + 1}</span>
          <span>Last sync: {lastSync}</span>
        </div>
      </div>

      {/* Action Status */}
      {actionStatus && (
        <div className="bg-blue-100 text-blue-800 px-4 py-2 text-center">
          {actionStatus}
          <button 
            onClick={() => setActionStatus('')}
            className="ml-4 text-blue-600 hover:text-blue-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Host Controls */}
      <div className="flex-1 p-4 space-y-6">
        {/* Match State Control */}
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-3">⏱️ Match State</h3>
          <div className="flex flex-wrap gap-2">
            {matchStates.map((state) => (
              <button
                key={state}
                onClick={() => setMatchState(state)}
                className={`px-4 py-2 rounded font-bold transition-colors ${
                  eventData?.match_state === state
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {state.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Motif Control */}
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-3">🎨 Motif Pattern</h3>
          <div className="flex gap-2">
            {motifs.map((motif) => (
              <button
                key={motif}
                onClick={() => setMotif(motif)}
                className={`px-6 py-3 rounded font-bold text-lg transition-colors ${
                  eventData?.motif === motif
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {motif} - {MOTIF_NAMES[motif]?.split('(')[1]?.replace(')', '') || motif}
              </button>
            ))}
          </div>
        </div>

        {/* Team Setup */}
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-3">👥 Team Setup</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Red Alliance */}
            <div className="p-3 rounded" style={{ backgroundColor: COLORS.RED_PRIMARY + '20' }}>
              <h4 className="font-bold text-red-700 mb-2">Red Alliance</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={redTeam1}
                  onChange={(e) => setRedTeam1(e.target.value)}
                  placeholder="Team 1 (e.g., 12345)"
                  className="w-full p-2 border rounded"
                />
                <input
                  type="text"
                  value={redTeam2}
                  onChange={(e) => setRedTeam2(e.target.value)}
                  placeholder="Team 2 (e.g., 67890)"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            {/* Blue Alliance */}
            <div className="p-3 rounded" style={{ backgroundColor: COLORS.BLUE_PRIMARY + '20' }}>
              <h4 className="font-bold text-blue-700 mb-2">Blue Alliance</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={blueTeam1}
                  onChange={(e) => setBlueTeam1(e.target.value)}
                  placeholder="Team 1 (e.g., 11111)"
                  className="w-full p-2 border rounded"
                />
                <input
                  type="text"
                  value={blueTeam2}
                  onChange={(e) => setBlueTeam2(e.target.value)}
                  placeholder="Team 2 (e.g., 22222)"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
          <button
            onClick={updateTeams}
            className="mt-3 bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700"
          >
            Update Teams
          </button>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-3">🔗 Share Links</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium w-24">Display:</span>
              <code className="flex-1 bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {typeof window !== 'undefined' ? `${window.location.origin}/display?event=${eventName}` : ''}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/display?event=${eventName}`)}
                className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
              >
                Copy
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Share the display link with your stream software (OBS, vMix, etc.) - no password required.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-gray-800 p-4 flex gap-4 justify-center">
        <button
          onClick={() => setShowHistory(true)}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-gray-700"
        >
          📊 History ({matchHistory.length})
        </button>
        <button
          onClick={resetScores}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-red-700"
        >
          🔄 Reset All Scores
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="bg-gray-500 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-gray-600"
        >
          🏠 Home
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

export default function HostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    }>
      <HostPageContent />
    </Suspense>
  );
}
