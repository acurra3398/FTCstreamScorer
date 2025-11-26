'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ScoreBar from '@/components/ScoreBar';
import { 
  DecodeScore, 
  EventData, 
  createDefaultScore, 
  extractRedScore, 
  extractBlueScore,
  calculateTotalWithPenalties,
  calculatePreciseTimerSeconds,
  formatTimeDisplay,
} from '@/lib/supabase';
import { COLORS, LAYOUT, MATCH_TIMING, VIDEO_FILES, AUDIO_FILES } from '@/lib/constants';

// API helper function - fetch event via server-side API route
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

// Allowed domains for livestream URLs (to prevent XSS)
const ALLOWED_LIVESTREAM_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'twitch.tv',
  'www.twitch.tv',
  'player.twitch.tv',
  'vimeo.com',
  'player.vimeo.com',
];

// Validate livestream URL to prevent XSS
function isValidLivestreamUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    // Must be https
    if (parsed.protocol !== 'https:') return false;
    // Must be from allowed domain
    return ALLOWED_LIVESTREAM_DOMAINS.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Display page for OBS Browser Source
 * Supports three modes via URL parameter:
 * - ?mode=overlay - Transparent background, just the score bar (for OBS overlay)
 * - ?mode=full (default) - Full display with colored panels
 * - ?mode=camera - Full 1920x1080 display with host camera and scores at bottom
 * 
 * OBS Setup:
 * 1. Add Browser Source
 * 2. URL: https://yoursite.com/display?event=EVENT_NAME&mode=camera
 * 3. Width: 1920
 * 4. Height: 1080
 * 5. Enable "Shutdown source when not visible" for performance
 */
function DisplayPageContent() {
  const searchParams = useSearchParams();
  const eventName = searchParams.get('event') || '';
  // Validate display mode parameter - allow 'full', 'overlay', or 'camera'
  const modeParam = searchParams.get('mode') || 'full';
  const displayMode = modeParam === 'overlay' ? 'overlay' : modeParam === 'camera' ? 'camera' : 'full';
  
  // Countdown state for pre-match countdown display
  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
  
  // Winner video state
  const [showWinnerVideo, setShowWinnerVideo] = useState(false);
  const [winnerVideoSrc, setWinnerVideoSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Track if we've already triggered the video for this score release
  const hasTriggeredVideo = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [redScore, setRedScore] = useState<DecodeScore>(createDefaultScore());
  const [blueScore, setBlueScore] = useState<DecodeScore>(createDefaultScore());
  const [eventData, setEventData] = useState<EventData | null>(null);
  
  // Timer state (synchronized from host)
  const [timerDisplay, setTimerDisplay] = useState('--:--');

  // Calculate timer display based on event data with precise sync
  const updateTimerDisplay = (data: EventData) => {
    const seconds = calculatePreciseTimerSeconds(data);
    setTimerDisplay(formatTimeDisplay(seconds));
  };
  
  // Determine winner and show video when scores are released
  useEffect(() => {
    if (!eventData || eventData.match_state !== 'SCORES_RELEASED') {
      // Reset when not in SCORES_RELEASED state
      if (!eventData || eventData.match_state === 'NOT_STARTED') {
        hasTriggeredVideo.current = false;
        setShowWinnerVideo(false);
        setWinnerVideoSrc(null);
      }
      return;
    }
    
    // Only trigger once per score release
    if (hasTriggeredVideo.current) return;
    hasTriggeredVideo.current = true;
    
    const redTotal = calculateTotalWithPenalties(redScore, blueScore);
    const blueTotal = calculateTotalWithPenalties(blueScore, redScore);
    
    let videoSrc: string;
    if (redTotal > blueTotal) {
      videoSrc = VIDEO_FILES.redWinner;
    } else if (blueTotal > redTotal) {
      videoSrc = VIDEO_FILES.blueWinner;
    } else {
      videoSrc = VIDEO_FILES.tie;
    }
    
    setWinnerVideoSrc(videoSrc);
    setShowWinnerVideo(true);
    
    // Play results audio
    if (audioRef.current) {
      audioRef.current.src = AUDIO_FILES.results;
      audioRef.current.play().catch(console.error);
    }
  }, [eventData?.match_state, redScore, blueScore]);
  
  // Handle video end
  const handleVideoEnd = () => {
    // Keep showing final scores after video ends
    setShowWinnerVideo(false);
  };

  // Connect to event
  useEffect(() => {
    async function connect() {
      if (!eventName) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchEventAPI(eventName);
        if (!data) {
          setError('Event not found');
          setIsLoading(false);
          return;
        }

        setEventData(data);
        setRedScore(extractRedScore(data));
        setBlueScore(extractBlueScore(data));
        updateTimerDisplay(data);
        setCountdownDisplay(data.countdown_number ?? null);
        setIsConnected(true);
        
      } catch (err) {
        setError('Connection failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
        const data = await fetchEventAPI(eventName);
        if (data) {
          setEventData(data);
          setRedScore(extractRedScore(data));
          setBlueScore(extractBlueScore(data));
          updateTimerDisplay(data);
          // Update countdown display from database
          setCountdownDisplay(data.countdown_number ?? null);
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
              const mode = formData.get('mode') as string;
              if (event) {
                const normalized = event.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                window.location.href = `/display?event=${normalized}${mode ? `&mode=${mode}` : ''}`;
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Mode
              </label>
              <select name="mode" className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg">
                <option value="full">Full Display (with colored panels)</option>
                <option value="overlay">Overlay Only (for OBS - transparent background)</option>
                <option value="camera">Camera + Scores (1920x1080 with host camera)</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full p-4 bg-blue-600 text-white rounded-lg font-bold text-xl"
            >
              View Scores
            </button>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <strong>OBS Setup:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Add a Browser Source in OBS</li>
                <li>Use &quot;Overlay Only&quot; mode for transparent background</li>
                <li>Set width/height to match your stream resolution</li>
                <li>Add your camera as a separate Video Capture source</li>
                <li>Layer the browser source over your camera</li>
              </ol>
            </div>
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
        <div className="bg-red-900 text-white p-6 rounded-lg max-w-lg text-center">
          <h2 className="text-2xl font-bold mb-4">❌ Connection Error</h2>
          <p className="mb-4 text-left">{error}</p>
          <button
            onClick={() => window.location.href = '/display'}
            className="bg-white text-gray-900 px-6 py-2 rounded font-bold"
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

  // Overlay mode - just the score bar at bottom with transparent background
  if (displayMode === 'overlay') {
    return (
      <div className="w-full h-screen flex flex-col justify-end bg-transparent">
        {/* Score Bar at bottom */}
        <div className="w-full">
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
      </div>
    );
  }

  // Camera mode - 1920x1080 aspect ratio with host camera and scores at bottom
  if (displayMode === 'camera') {
    return (
      <div 
        className="flex flex-col overflow-hidden"
        style={{ 
          width: '1920px',
          height: '1080px',
          backgroundColor: COLORS.BLACK,
        }}
      >
        {/* Countdown overlay */}
        {countdownDisplay !== null && (
          <div 
            className="absolute inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          >
            <div 
              className="text-white font-bold animate-pulse"
              style={{ 
                fontSize: '300px',
                fontFamily: 'Arial, sans-serif',
                textShadow: '0 0 50px rgba(255, 255, 255, 0.5)',
              }}
            >
              {countdownDisplay}
            </div>
          </div>
        )}
        
        {/* Host Camera / Video Area - takes up most of the screen */}
        <div 
          className="flex-1 flex items-center justify-center relative"
          style={{ backgroundColor: COLORS.BLACK }}
        >
          {/* Hidden audio element for results sound */}
          <audio ref={audioRef} preload="auto" />
          
          {/* Winner Video Overlay */}
          {showWinnerVideo && winnerVideoSrc && (
            <div className="absolute inset-0 z-40">
              <video
                ref={videoRef}
                src={winnerVideoSrc}
                autoPlay
                onEnded={handleVideoEnd}
                className="w-full h-full object-contain"
                style={{ backgroundColor: COLORS.BLACK }}
              />
            </div>
          )}
          
          {/* Final Results Display (after video) */}
          {!showWinnerVideo && eventData?.match_state === 'SCORES_RELEASED' && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ backgroundColor: COLORS.BLACK }}>
              <div 
                className="text-white font-bold mb-8"
                style={{ 
                  fontSize: '72px',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                🏆 FINAL RESULTS 🏆
              </div>
              <div className="flex gap-32">
                <div className="text-center">
                  <div className="text-red-500 font-bold mb-2" style={{ fontSize: '36px' }}>RED ALLIANCE</div>
                  <div className="text-white font-bold" style={{ fontSize: '120px' }}>
                    {calculateTotalWithPenalties(redScore, blueScore)}
                  </div>
                  <div className="text-gray-400" style={{ fontSize: '24px' }}>
                    {eventData?.red_team1 || '----'} + {eventData?.red_team2 || '----'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-blue-500 font-bold mb-2" style={{ fontSize: '36px' }}>BLUE ALLIANCE</div>
                  <div className="text-white font-bold" style={{ fontSize: '120px' }}>
                    {calculateTotalWithPenalties(blueScore, redScore)}
                  </div>
                  <div className="text-gray-400" style={{ fontSize: '24px' }}>
                    {eventData?.blue_team1 || '----'} + {eventData?.blue_team2 || '----'}
                  </div>
                </div>
              </div>
              <div 
                className="text-yellow-400 font-bold mt-8 animate-pulse"
                style={{ fontSize: '48px' }}
              >
                {calculateTotalWithPenalties(redScore, blueScore) > calculateTotalWithPenalties(blueScore, redScore) 
                  ? '🔴 RED WINS! 🔴' 
                  : calculateTotalWithPenalties(blueScore, redScore) > calculateTotalWithPenalties(redScore, blueScore)
                    ? '🔵 BLUE WINS! 🔵'
                    : '🤝 TIE GAME! 🤝'
                }
              </div>
            </div>
          )}
          
          {/* Normal camera/stream display when not showing results */}
          {!showWinnerVideo && eventData?.match_state !== 'SCORES_RELEASED' && (
            eventData?.livestream_url && isValidLivestreamUrl(eventData.livestream_url) ? (
              <iframe
                src={eventData.livestream_url}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation"
              />
            ) : eventData?.livestream_url ? (
              <div className="text-yellow-500 text-center">
                <div 
                  className="font-bold mb-2"
                  style={{ 
                    fontSize: '32px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  ⚠️ Invalid Stream URL
                </div>
                <div 
                  style={{ 
                    fontSize: '18px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Only YouTube, Twitch, and Vimeo URLs are supported
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center">
                <div 
                  className="font-bold mb-2"
                  style={{ 
                    fontSize: '48px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  📹 Waiting for Match
                </div>
                <div 
                  style={{ 
                    fontSize: '24px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Display will show match when host starts
                </div>
              </div>
            )
          )}
        </div>

        {/* Score Bar at bottom - fixed height ~182px for 1080p (16.88%) */}
        <div 
          className="w-full flex-shrink-0"
          style={{ height: '182px' }}
        >
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
      </div>
    );
  }

  // Full display mode - colored panels with score bar
  return (
    <div 
      className="w-full h-screen flex flex-col overflow-hidden relative"
      style={{ backgroundColor: COLORS.BLACK }}
    >
      {/* Hidden audio element for results sound */}
      <audio ref={audioRef} preload="auto" />
      
      {/* Countdown overlay */}
      {countdownDisplay !== null && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div 
            className="text-white font-bold animate-pulse"
            style={{ 
              fontSize: '300px',
              fontFamily: 'Arial, sans-serif',
              textShadow: '0 0 50px rgba(255, 255, 255, 0.5)',
            }}
          >
            {countdownDisplay}
          </div>
        </div>
      )}
      
      {/* Winner Video Overlay */}
      {showWinnerVideo && winnerVideoSrc && (
        <div className="absolute inset-0 z-40">
          <video
            ref={videoRef}
            src={winnerVideoSrc}
            autoPlay
            onEnded={handleVideoEnd}
            className="w-full h-full object-contain"
            style={{ backgroundColor: COLORS.BLACK }}
          />
        </div>
      )}
      
      {/* Final Results Display (after video) */}
      {!showWinnerVideo && eventData?.match_state === 'SCORES_RELEASED' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ backgroundColor: COLORS.BLACK }}>
          <div 
            className="text-white font-bold mb-8"
            style={{ 
              fontSize: '72px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            🏆 FINAL RESULTS 🏆
          </div>
          <div className="flex gap-32">
            <div className="text-center">
              <div className="text-red-500 font-bold mb-2" style={{ fontSize: '36px' }}>RED ALLIANCE</div>
              <div className="text-white font-bold" style={{ fontSize: '120px' }}>
                {redTotal}
              </div>
              <div className="text-gray-400" style={{ fontSize: '24px' }}>
                {eventData?.red_team1 || '----'} + {eventData?.red_team2 || '----'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-blue-500 font-bold mb-2" style={{ fontSize: '36px' }}>BLUE ALLIANCE</div>
              <div className="text-white font-bold" style={{ fontSize: '120px' }}>
                {blueTotal}
              </div>
              <div className="text-gray-400" style={{ fontSize: '24px' }}>
                {eventData?.blue_team1 || '----'} + {eventData?.blue_team2 || '----'}
              </div>
            </div>
          </div>
          <div 
            className="text-yellow-400 font-bold mt-8 animate-pulse"
            style={{ fontSize: '48px' }}
          >
            {redTotal > blueTotal 
              ? '🔴 RED WINS! 🔴' 
              : blueTotal > redTotal
                ? '🔵 BLUE WINS! 🔵'
                : '🤝 TIE GAME! 🤝'
            }
          </div>
        </div>
      )}
      
      {/* Video/Content Area - 83.12% of height */}
      <div 
        className="flex w-full"
        style={{ height: `${LAYOUT.VIDEO_AREA_HEIGHT_PERCENT}%` }}
      >
        {/* Red Alliance Panel */}
        <div 
          className="flex-1 flex flex-col items-center justify-center"
          style={{ 
            backgroundColor: COLORS.RED_PRIMARY,
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
            {timerDisplay}
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
            {matchPhase === 'NOT_STARTED' ? 'READY' : matchPhase.replace(/_/g, ' ')}
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

      {/* Bottom Score Bar - 16.88% of height - centered */}
      <div 
        className="w-full flex items-center justify-center"
        style={{ height: `${LAYOUT.OVERLAY_HEIGHT_PERCENT}%` }}
      >
        <div className="w-full h-full">
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
