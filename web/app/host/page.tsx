'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
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
} from '@/lib/supabase';
import { COLORS, MOTIF_NAMES, VALID_MOTIFS, MATCH_TIMING, AUDIO_FILES } from '@/lib/constants';

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

// Audio service hook for managing match sounds
function useAudioService() {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  
  useEffect(() => {
    // Preload audio files
    Object.entries(AUDIO_FILES).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audioRefs.current[key] = audio;
    });
    
    return () => {
      // Cleanup
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);
  
  const playAudio = useCallback((key: string, onEnded?: () => void) => {
    const audio = audioRefs.current[key];
    if (audio) {
      audio.currentTime = 0;
      if (onEnded) {
        audio.onended = onEnded;
      }
      audio.play().catch(err => console.error('Audio playback failed:', err));
    } else if (onEnded) {
      onEnded();
    }
  }, []);
  
  const stopAll = useCallback(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);
  
  return { playAudio, stopAll };
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
  
  // Livestream URL for display camera mode
  const [livestreamUrl, setLivestreamUrl] = useState('');
  
  // Camera state
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(MATCH_TIMING.AUTO_DURATION);
  const [matchPhase, setMatchPhase] = useState<MatchState>('NOT_STARTED');
  const [totalElapsed, setTotalElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waitingForSound = useRef(false);
  
  const { playAudio, stopAll } = useAudioService();

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load available cameras
  useEffect(() => {
    async function loadCameras() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
        if (cameras.length > 0 && !selectedCamera) {
          setSelectedCamera(cameras[0].deviceId);
        }
      } catch (err) {
        console.error('Error loading cameras:', err);
      }
    }
    loadCameras();
  }, []);

  // Start/stop camera when selection changes
  useEffect(() => {
    async function startCamera() {
      if (!cameraEnabled || !selectedCamera) {
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        return;
      }

      try {
        // Stop existing stream
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera } }
        });
        setCameraStream(stream);
        
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error starting camera:', err);
      }
    }
    startCamera();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedCamera, cameraEnabled]);

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
        setLivestreamUrl(data.livestream_url || '');
        setMatchPhase(data.match_state || 'NOT_STARTED');
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

  // Poll for updates (but don't override local timer state)
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

  // Timer tick function - syncs timer state to database for all clients
  const tick = useCallback(() => {
    if (waitingForSound.current) return;
    
    setTotalElapsed(prev => prev + 1);
    
    if (matchPhase === 'AUTONOMOUS') {
      const remaining = MATCH_TIMING.AUTO_DURATION - totalElapsed - 1;
      setSecondsRemaining(remaining);
      
      // Sync timer to database
      hostActionAPI(eventName, password, 'updateTimerState', { 
        timerSecondsRemaining: remaining,
        timerRunning: true,
      }).catch(console.error);
      
      if (remaining <= 0 && !waitingForSound.current) {
        waitingForSound.current = true;
        playAudio('endauto', () => {
          setMatchPhase('TRANSITION');
          setTotalElapsed(0);
          setSecondsRemaining(MATCH_TIMING.TRANSITION_DURATION);
          waitingForSound.current = false;
          playAudio('transition');
          hostActionAPI(eventName, password, 'setMatchState', { matchState: 'TRANSITION' }).catch(console.error);
          hostActionAPI(eventName, password, 'updateTimerState', { 
            timerSecondsRemaining: MATCH_TIMING.TRANSITION_DURATION,
          }).catch(console.error);
        });
      }
    } else if (matchPhase === 'TRANSITION') {
      const remaining = MATCH_TIMING.TRANSITION_DURATION - totalElapsed - 1;
      setSecondsRemaining(remaining);
      
      // Sync timer to database
      hostActionAPI(eventName, password, 'updateTimerState', { 
        timerSecondsRemaining: remaining,
      }).catch(console.error);
      
      if (remaining <= 0) {
        setMatchPhase('TELEOP');
        setTotalElapsed(0);
        setSecondsRemaining(MATCH_TIMING.TELEOP_DURATION);
        hostActionAPI(eventName, password, 'setMatchState', { matchState: 'TELEOP' }).catch(console.error);
        hostActionAPI(eventName, password, 'updateTimerState', { 
          timerSecondsRemaining: MATCH_TIMING.TELEOP_DURATION,
        }).catch(console.error);
      }
    } else if (matchPhase === 'TELEOP' || matchPhase === 'END_GAME') {
      const remaining = MATCH_TIMING.TELEOP_DURATION - totalElapsed - 1;
      setSecondsRemaining(remaining);
      
      // Sync timer to database
      hostActionAPI(eventName, password, 'updateTimerState', { 
        timerSecondsRemaining: remaining,
      }).catch(console.error);
      
      // Check for endgame start (20 seconds remaining)
      if (totalElapsed + 1 === MATCH_TIMING.ENDGAME_START && matchPhase !== 'END_GAME') {
        setMatchPhase('END_GAME');
        playAudio('endgame');
        hostActionAPI(eventName, password, 'setMatchState', { matchState: 'END_GAME' }).catch(console.error);
      }
      
      if (remaining <= 0 && !waitingForSound.current) {
        waitingForSound.current = true;
        setTimerRunning(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setMatchPhase('FINISHED');
        hostActionAPI(eventName, password, 'setMatchState', { matchState: 'FINISHED' }).catch(console.error);
        hostActionAPI(eventName, password, 'updateTimerState', { 
          timerRunning: false,
          timerSecondsRemaining: 0,
        }).catch(console.error);
        
        playAudio('endmatch', () => {
          setMatchPhase('UNDER_REVIEW');
          waitingForSound.current = false;
          hostActionAPI(eventName, password, 'setMatchState', { matchState: 'UNDER_REVIEW' }).catch(console.error);
        });
      }
    }
  }, [matchPhase, totalElapsed, eventName, password, playAudio]);

  // Timer effect
  useEffect(() => {
    if (timerRunning && !timerPaused) {
      timerRef.current = setInterval(tick, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning, timerPaused, tick]);

  // Start match with 5-4-3-2-1 countdown synced to sound
  const handleStart = async () => {
    if (timerRunning) return;
    
    // Reset everything for new match
    setTotalElapsed(0);
    setSecondsRemaining(MATCH_TIMING.AUTO_DURATION);
    waitingForSound.current = true;
    setActionStatus('Match starting with countdown...');
    
    // Play countdown audio and sync countdown numbers
    playAudio('countdown');
    
    // 5-4-3-2-1 countdown - each number lasts ~1 second (total ~5 seconds for countdown.wav)
    const countdownNumbers = [5, 4, 3, 2, 1];
    let countdownIndex = 0;
    
    // Start countdown display
    const showCountdown = async () => {
      if (countdownIndex < countdownNumbers.length) {
        const currentNumber = countdownNumbers[countdownIndex];
        // Sync countdown to database for display and referee tablets
        hostActionAPI(eventName, password, 'setCountdown', { countdownNumber: currentNumber }).catch(console.error);
        countdownIndex++;
        setTimeout(showCountdown, 1000);
      } else {
        // Countdown finished - clear the countdown display and start match
        await hostActionAPI(eventName, password, 'setCountdown', { countdownNumber: null }).catch(console.error);
        
        // Play match start sound
        playAudio('startmatch', () => {
          setMatchPhase('AUTONOMOUS');
          setTimerRunning(true);
          setTimerPaused(false);
          waitingForSound.current = false;
          
          // Sync match state and timer
          hostActionAPI(eventName, password, 'setMatchState', { matchState: 'AUTONOMOUS' }).catch(console.error);
          hostActionAPI(eventName, password, 'updateTimerState', { 
            timerRunning: true,
            timerPaused: false,
            timerSecondsRemaining: MATCH_TIMING.AUTO_DURATION,
            timerStartedAt: new Date().toISOString(),
          }).catch(console.error);
        });
      }
    };
    
    // Start the countdown
    showCountdown();
  };

  // Stop match
  const handleStop = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerRunning(false);
    setTimerPaused(false);
    setTotalElapsed(0);
    setSecondsRemaining(MATCH_TIMING.AUTO_DURATION);
    setMatchPhase('NOT_STARTED');
    waitingForSound.current = false;
    stopAll();
    
    try {
      await hostActionAPI(eventName, password, 'setMatchState', { matchState: 'NOT_STARTED' });
      await hostActionAPI(eventName, password, 'setCountdown', { countdownNumber: null });
      await hostActionAPI(eventName, password, 'updateTimerState', { 
        timerRunning: false,
        timerPaused: false,
        timerSecondsRemaining: MATCH_TIMING.AUTO_DURATION,
      });
      setActionStatus('Match stopped');
    } catch (err) {
      console.error('Error stopping match:', err);
      setActionStatus('Match stopped (sync error)');
    }
  };

  // Pause match
  const handlePause = () => {
    if (!timerRunning || timerPaused) return;
    setTimerPaused(true);
    setActionStatus('Match paused');
  };

  // Resume match
  const handleResume = () => {
    if (!timerRunning || !timerPaused) return;
    setTimerPaused(false);
    setActionStatus('Match resumed');
  };

  // Set motif
  const setMotif = async (motif: MotifType) => {
    const result = await hostActionAPI(eventName, password, 'setMotif', { motif });
    setActionStatus(result.message);
    if (result.success) {
      const data = await fetchEventAPI(eventName);
      if (data) setEventData(data);
    }
  };

  // Update teams
  const updateTeams = async () => {
    const result = await hostActionAPI(eventName, password, 'setTeams', {
      redTeam1,
      redTeam2,
      blueTeam1,
      blueTeam2,
    });
    setActionStatus(result.message);
  };

  // Update livestream URL
  const updateLivestreamUrl = async () => {
    const result = await hostActionAPI(eventName, password, 'setLivestreamUrl', {
      livestreamUrl,
    });
    setActionStatus(result.message);
    if (result.success) {
      const data = await fetchEventAPI(eventName);
      if (data) setEventData(data);
    }
  };

  // Record match
  const handleRecordMatch = async () => {
    if (!eventData) return;
    
    const matchNumber = matchHistory.length + 1;
    const result = await recordMatchAPI(eventName, matchNumber);
    if (result.success) {
      const history = await getMatchHistoryAPI(eventName);
      setMatchHistory(history);
      setActionStatus(`Match ${matchNumber} recorded successfully!`);
    } else {
      setActionStatus(`Failed to record match: ${result.message}`);
    }
  };

  // Reset scores
  const resetScores = async () => {
    if (!confirm('Reset all scores for a new match? This cannot be undone.')) return;
    
    handleStop();
    
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
          matchPhase={matchPhase}
          timeDisplay={formatTime(secondsRemaining)}
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
      <div className="flex-1 p-4 space-y-6 overflow-auto">
        {/* Timer Control */}
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-3">⏱️ Match Timer</h3>
          
          {/* Timer Display */}
          <div className="text-center mb-4">
            <div className="text-6xl font-bold font-mono mb-2">
              {formatTime(secondsRemaining)}
            </div>
            <div className={`text-xl font-bold ${
              matchPhase === 'AUTONOMOUS' ? 'text-green-600' :
              matchPhase === 'TRANSITION' ? 'text-yellow-600' :
              matchPhase === 'TELEOP' ? 'text-blue-600' :
              matchPhase === 'END_GAME' ? 'text-orange-600' :
              matchPhase === 'FINISHED' || matchPhase === 'UNDER_REVIEW' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {matchPhase === 'NOT_STARTED' ? 'READY' : matchPhase.replace(/_/g, ' ')}
            </div>
            {timerPaused && (
              <div className="text-lg text-yellow-600 font-bold mt-1">⏸️ PAUSED</div>
            )}
          </div>
          
          {/* Timer Control Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            {!timerRunning ? (
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
              >
                ▶️ Start Match
              </button>
            ) : (
              <>
                <button
                  onClick={handleStop}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-700 transition-colors"
                >
                  ⏹️ Stop
                </button>
                {!timerPaused ? (
                  <button
                    onClick={handlePause}
                    className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-bold text-lg hover:bg-yellow-600 transition-colors"
                  >
                    ⏸️ Pause
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors"
                  >
                    ▶️ Resume
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Match Timeline */}
          <div className="mt-4 text-sm text-gray-600 text-center">
            <span>AUTO (0:30)</span>
            <span className="mx-2">→</span>
            <span>TRANSITION (0:08)</span>
            <span className="mx-2">→</span>
            <span>TELEOP (2:00)</span>
            <span className="mx-2">→</span>
            <span>ENDGAME (last 0:20)</span>
          </div>
        </div>

        {/* Motif Control */}
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-3">🎨 Motif Pattern</h3>
          <div className="flex gap-2 flex-wrap">
            {VALID_MOTIFS.map((motif) => (
              <button
                key={motif}
                onClick={() => setMotif(motif as MotifType)}
                className={`px-6 py-3 rounded font-bold text-lg transition-colors ${
                  eventData?.motif === motif
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {motif} - {MOTIF_NAMES[motif]?.split('(')[1]?.replace(')', '') || motif}
              </button>
            ))}
            <button
              onClick={() => {
                const randomMotif = VALID_MOTIFS[Math.floor(Math.random() * VALID_MOTIFS.length)] as MotifType;
                setMotif(randomMotif);
              }}
              className="px-6 py-3 rounded font-bold text-lg transition-colors bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              🎲 Randomize
            </button>
          </div>
        </div>

        {/* Camera Preview (for host reference) */}
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-3">📹 Camera Preview</h3>
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="flex-1 p-2 border rounded"
                disabled={availableCameras.length === 0}
              >
                {availableCameras.length === 0 ? (
                  <option value="">No cameras found</option>
                ) : (
                  availableCameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                className={`px-4 py-2 rounded font-bold transition-colors ${
                  cameraEnabled 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {cameraEnabled ? '⏹️ Stop' : '▶️ Start'}
              </button>
            </div>
            
            {/* Camera preview */}
            {cameraEnabled && (
              <div className="relative bg-black rounded overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Livestream URL for display camera mode */}
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Livestream URL (for Camera Display Mode)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={livestreamUrl}
                  onChange={(e) => setLivestreamUrl(e.target.value)}
                  placeholder="https://youtube.com/embed/... or stream URL"
                  className="flex-1 p-2 border rounded text-sm"
                />
                <button
                  onClick={updateLivestreamUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
                >
                  Set URL
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use this to embed a livestream in the Camera display mode (/display?mode=camera).
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mt-3">
              <strong>For OBS:</strong> Add the Display page as a Browser Source in OBS. You can add your camera as a separate Video Capture source and layer it with the score overlay.
            </p>
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
      <div className="sticky bottom-0 bg-gray-800 p-4 flex gap-4 justify-center flex-wrap">
        <button
          onClick={handleRecordMatch}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-purple-700"
        >
          📝 Record Match #{matchHistory.length + 1}
        </button>
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
