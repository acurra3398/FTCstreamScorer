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
  calculateScoreBreakdown,
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
  
  // Audio streaming receiver state
  const announcerAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const lastSdpOfferRef = useRef<string>('');
  
  // Video streaming receiver state
  const hostVideoRef = useRef<HTMLVideoElement>(null);
  const videoPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const lastVideoSdpOfferRef = useRef<string>('');
  const [hostVideoStream, setHostVideoStream] = useState<MediaStream | null>(null);
  const [videoConnectionStatus, setVideoConnectionStatus] = useState<string>('');
  
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
  
  // Local timer update effect - recalculates every 100ms for smooth display
  // This ensures the timer updates even between server polls
  useEffect(() => {
    if (!eventData || !eventData.timer_running || eventData.timer_paused) {
      return;
    }
    
    const localTimer = setInterval(() => {
      const seconds = calculatePreciseTimerSeconds(eventData);
      setTimerDisplay(formatTimeDisplay(seconds));
    }, 100);
    
    return () => clearInterval(localTimer);
  }, [eventData]);
  
  // Handle WebRTC audio streaming from host
  useEffect(() => {
    async function handleAudioStreaming(data: EventData) {
      // Check if audio is enabled and we have an SDP offer
      if (!data.audio_enabled || !data.audio_sdp_offer) {
        // Audio disabled - cleanup
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        lastSdpOfferRef.current = '';
        return;
      }
      
      // Check if this is a new offer
      if (data.audio_sdp_offer === lastSdpOfferRef.current) {
        return; // Same offer, no action needed
      }
      
      lastSdpOfferRef.current = data.audio_sdp_offer;
      
      try {
        // Create peer connection for receiving audio
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
        }
        
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerConnectionRef.current = pc;
        
        // Handle incoming audio track
        pc.ontrack = (event) => {
          if (announcerAudioRef.current && event.streams[0]) {
            announcerAudioRef.current.srcObject = event.streams[0];
            announcerAudioRef.current.play().catch(console.error);
          }
        };
        
        // Set remote description (the offer from host)
        const offer = JSON.parse(data.audio_sdp_offer);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Add ICE candidates from host
        if (data.audio_ice_candidates) {
          const candidates = JSON.parse(data.audio_ice_candidates);
          for (const candidate of candidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
        
        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Send answer back to host via API
        // Note: This would need a separate mechanism to update the event
        // For now, we're using a simplified approach where the connection 
        // is established through the SDP exchange
      } catch (err) {
        console.error('Error setting up audio receiver:', err);
      }
    }
    
    if (eventData) {
      handleAudioStreaming(eventData);
    }
    
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [eventData?.audio_enabled, eventData?.audio_sdp_offer, eventData?.audio_ice_candidates]);
  
  // Handle WebRTC video streaming from host
  useEffect(() => {
    async function handleVideoStreaming(data: EventData) {
      // Check if video is enabled and we have an SDP offer
      if (!data.video_enabled || !data.video_sdp_offer) {
        // Video disabled - cleanup
        if (videoPeerConnectionRef.current) {
          videoPeerConnectionRef.current.close();
          videoPeerConnectionRef.current = null;
        }
        lastVideoSdpOfferRef.current = '';
        setHostVideoStream(null);
        setVideoConnectionStatus('');
        return;
      }
      
      // Check if this is a new offer
      if (data.video_sdp_offer === lastVideoSdpOfferRef.current) {
        return; // Same offer, no action needed
      }
      
      lastVideoSdpOfferRef.current = data.video_sdp_offer;
      setVideoConnectionStatus('Connecting to host camera...');
      
      try {
        // Parse the offer first to validate it
        let offer;
        try {
          offer = JSON.parse(data.video_sdp_offer);
        } catch (parseErr) {
          console.error('Invalid video SDP offer:', parseErr);
          setVideoConnectionStatus('Error: Invalid video offer received');
          return;
        }
        
        // Create peer connection for receiving video
        if (videoPeerConnectionRef.current) {
          videoPeerConnectionRef.current.close();
        }
        
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        });
        videoPeerConnectionRef.current = pc;
        
        // Handle incoming video track
        pc.ontrack = (event) => {
          console.log('Received video track from host');
          setHostVideoStream(event.streams[0]);
          setVideoConnectionStatus('Connected - Receiving video');
          
          if (hostVideoRef.current && event.streams[0]) {
            hostVideoRef.current.srcObject = event.streams[0];
            hostVideoRef.current.play().catch(console.error);
          }
        };
        
        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          console.log('Video connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setVideoConnectionStatus('Connected');
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setVideoConnectionStatus('Connection lost');
            setHostVideoStream(null);
          }
        };
        
        // Collect ICE candidates to send back to host
        const iceCandidates: RTCIceCandidate[] = [];
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            iceCandidates.push(event.candidate);
            // Send candidates to database for host to pick up
            try {
              await fetch(`/api/events/${encodeURIComponent(eventName)}/video-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  iceCandidates: JSON.stringify(iceCandidates.map(c => c.toJSON()))
                }),
              });
            } catch (e) {
              console.error('Error sending ICE candidates:', e);
            }
          }
        };
        
        // Set remote description (the offer was already parsed above)
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Add host's ICE candidates
        if (data.video_ice_candidates_host) {
          try {
            const hostCandidates = JSON.parse(data.video_ice_candidates_host);
            for (const candidate of hostCandidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error('Error adding host ICE candidate:', e);
              }
            }
          } catch (parseErr) {
            console.error('Error parsing host ICE candidates:', parseErr);
          }
        }
        
        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Send answer back to host via API
        try {
          await fetch(`/api/events/${encodeURIComponent(eventName)}/video-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              answer: JSON.stringify(answer)
            }),
          });
          setVideoConnectionStatus('Answer sent - waiting for connection...');
        } catch (e) {
          console.error('Error sending video answer:', e);
          setVideoConnectionStatus('Error connecting');
        }
      } catch (err) {
        console.error('Error setting up video receiver:', err);
        setVideoConnectionStatus('Error: ' + (err instanceof Error ? err.message : 'Unknown'));
      }
    }
    
    if (eventData) {
      handleVideoStreaming(eventData);
    }
    
    return () => {
      if (videoPeerConnectionRef.current) {
        videoPeerConnectionRef.current.close();
        videoPeerConnectionRef.current = null;
      }
    };
  }, [eventData?.video_enabled, eventData?.video_sdp_offer, eventData?.video_ice_candidates_host, eventName]);
  
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
        {/* Hidden audio element for announcer audio streaming (camera mode) 
            Note: This element only renders in camera mode. For full display mode, 
            a similar element is rendered below. Only one mode is active at a time. */}
        <audio ref={announcerAudioRef} autoPlay style={{ display: 'none' }} />
        
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
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-auto" style={{ backgroundColor: COLORS.BLACK }}>
              <div 
                className="text-white font-bold mb-4"
                style={{ 
                  fontSize: '48px',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                🏆 FINAL RESULTS 🏆
              </div>
              <div className="flex gap-16 mb-4">
                <div className="text-center">
                  <div className="text-red-500 font-bold mb-1" style={{ fontSize: '28px' }}>RED ALLIANCE</div>
                  <div className="text-white font-bold" style={{ fontSize: '80px' }}>
                    {calculateTotalWithPenalties(redScore, blueScore)}
                  </div>
                  <div className="text-gray-400" style={{ fontSize: '18px' }}>
                    {eventData?.red_team1 || '----'} + {eventData?.red_team2 || '----'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-blue-500 font-bold mb-1" style={{ fontSize: '28px' }}>BLUE ALLIANCE</div>
                  <div className="text-white font-bold" style={{ fontSize: '80px' }}>
                    {calculateTotalWithPenalties(blueScore, redScore)}
                  </div>
                  <div className="text-gray-400" style={{ fontSize: '18px' }}>
                    {eventData?.blue_team1 || '----'} + {eventData?.blue_team2 || '----'}
                  </div>
                </div>
              </div>
              <div 
                className="text-yellow-400 font-bold mb-4 animate-pulse"
                style={{ fontSize: '36px' }}
              >
                {calculateTotalWithPenalties(redScore, blueScore) > calculateTotalWithPenalties(blueScore, redScore) 
                  ? '🔴 RED WINS! 🔴' 
                  : calculateTotalWithPenalties(blueScore, redScore) > calculateTotalWithPenalties(redScore, blueScore)
                    ? '🔵 BLUE WINS! 🔵'
                    : '🤝 TIE GAME! 🤝'
                }
              </div>
              
              {/* Score Breakdown Table */}
              <div className="flex gap-8">
                {/* Red Score Breakdown */}
                {(() => {
                  const redBreakdown = calculateScoreBreakdown(redScore, blueScore);
                  return (
                    <div className="bg-red-900/50 rounded-lg p-4 min-w-[280px]">
                      <div className="text-red-300 font-bold text-center mb-3" style={{ fontSize: '20px' }}>RED BREAKDOWN</div>
                      <table className="w-full text-white" style={{ fontSize: '14px' }}>
                        <tbody>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">🚗 Auto Leave</td>
                            <td className="text-right font-bold">{redBreakdown.autoLeave}</td>
                          </tr>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">🟢 Auto Classified (×3)</td>
                            <td className="text-right font-bold">{redBreakdown.autoClassified}</td>
                          </tr>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">➕ Auto Overflow</td>
                            <td className="text-right font-bold">{redBreakdown.autoOverflow}</td>
                          </tr>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">✔ Auto Pattern (×2)</td>
                            <td className="text-right font-bold">{redBreakdown.autoPattern}</td>
                          </tr>
                          <tr className="border-b border-red-700/50 bg-red-800/30">
                            <td className="py-1 font-bold">Auto Subtotal</td>
                            <td className="text-right font-bold">{redBreakdown.autoTotal}</td>
                          </tr>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">🟢 Teleop Classified (×3)</td>
                            <td className="text-right font-bold">{redBreakdown.teleopClassified}</td>
                          </tr>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">➕ Teleop Overflow</td>
                            <td className="text-right font-bold">{redBreakdown.teleopOverflow}</td>
                          </tr>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">📦 Teleop Depot</td>
                            <td className="text-right font-bold">{redBreakdown.teleopDepot}</td>
                          </tr>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">✔ Teleop Pattern (×2)</td>
                            <td className="text-right font-bold">{redBreakdown.teleopPattern}</td>
                          </tr>
                          <tr className="border-b border-red-700/50 bg-red-800/30">
                            <td className="py-1 font-bold">Teleop Subtotal</td>
                            <td className="text-right font-bold">{redBreakdown.teleopTotal}</td>
                          </tr>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">🏠 BASE Return</td>
                            <td className="text-right font-bold">{redBreakdown.endgameBase}</td>
                          </tr>
                          <tr className="border-b border-red-700/50">
                            <td className="py-1">⚠ Opponent Penalties</td>
                            <td className="text-right font-bold text-green-400">+{redBreakdown.penaltyPoints}</td>
                          </tr>
                          <tr className="bg-red-700/50">
                            <td className="py-2 font-bold text-lg">TOTAL</td>
                            <td className="text-right font-bold text-lg">{redBreakdown.totalScore}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
                
                {/* Blue Score Breakdown */}
                {(() => {
                  const blueBreakdown = calculateScoreBreakdown(blueScore, redScore);
                  return (
                    <div className="bg-blue-900/50 rounded-lg p-4 min-w-[280px]">
                      <div className="text-blue-300 font-bold text-center mb-3" style={{ fontSize: '20px' }}>BLUE BREAKDOWN</div>
                      <table className="w-full text-white" style={{ fontSize: '14px' }}>
                        <tbody>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">🚗 Auto Leave</td>
                            <td className="text-right font-bold">{blueBreakdown.autoLeave}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">🟢 Auto Classified (×3)</td>
                            <td className="text-right font-bold">{blueBreakdown.autoClassified}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">➕ Auto Overflow</td>
                            <td className="text-right font-bold">{blueBreakdown.autoOverflow}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">✔ Auto Pattern (×2)</td>
                            <td className="text-right font-bold">{blueBreakdown.autoPattern}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50 bg-blue-800/30">
                            <td className="py-1 font-bold">Auto Subtotal</td>
                            <td className="text-right font-bold">{blueBreakdown.autoTotal}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">🟢 Teleop Classified (×3)</td>
                            <td className="text-right font-bold">{blueBreakdown.teleopClassified}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">➕ Teleop Overflow</td>
                            <td className="text-right font-bold">{blueBreakdown.teleopOverflow}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">📦 Teleop Depot</td>
                            <td className="text-right font-bold">{blueBreakdown.teleopDepot}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">✔ Teleop Pattern (×2)</td>
                            <td className="text-right font-bold">{blueBreakdown.teleopPattern}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50 bg-blue-800/30">
                            <td className="py-1 font-bold">Teleop Subtotal</td>
                            <td className="text-right font-bold">{blueBreakdown.teleopTotal}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">🏠 BASE Return</td>
                            <td className="text-right font-bold">{blueBreakdown.endgameBase}</td>
                          </tr>
                          <tr className="border-b border-blue-700/50">
                            <td className="py-1">⚠ Opponent Penalties</td>
                            <td className="text-right font-bold text-green-400">+{blueBreakdown.penaltyPoints}</td>
                          </tr>
                          <tr className="bg-blue-700/50">
                            <td className="py-2 font-bold text-lg">TOTAL</td>
                            <td className="text-right font-bold text-lg">{blueBreakdown.totalScore}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          
          {/* Normal camera/stream display when not showing results */}
          {!showWinnerVideo && eventData?.match_state !== 'SCORES_RELEASED' && (
            // Priority 1: Show host's WebRTC video stream if available
            hostVideoStream ? (
              <video
                ref={hostVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
                style={{ backgroundColor: COLORS.BLACK }}
              />
            ) : eventData?.livestream_url && isValidLivestreamUrl(eventData.livestream_url) ? (
              // Priority 2: Show embedded livestream URL
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
            ) : eventData?.video_enabled ? (
              // Priority 3: Video enabled but not connected yet
              <div className="text-gray-400 text-center flex flex-col items-center justify-center h-full">
                <div 
                  className="font-bold mb-4 text-yellow-400"
                  style={{ 
                    fontSize: '36px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  📡 Connecting to Host Camera...
                </div>
                <div 
                  className="text-gray-500"
                  style={{ 
                    fontSize: '18px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  {videoConnectionStatus || 'Waiting for video stream...'}
                </div>
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-yellow-500"></div>
                </div>
              </div>
            ) : (
              // Priority 4: No video source - show status
              <div className="text-gray-400 text-center flex flex-col items-center justify-center h-full">
                {eventData?.match_state === 'NOT_STARTED' ? (
                  <>
                    <div 
                      className="font-bold mb-4"
                      style={{ 
                        fontSize: '48px',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      ⏳ Match Ready
                    </div>
                    <div 
                      className="text-gray-500"
                      style={{ 
                        fontSize: '24px',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      Waiting for host to start the match
                    </div>
                    <div 
                      className="text-gray-600 mt-4"
                      style={{ 
                        fontSize: '16px',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      Event: {eventName}
                    </div>
                    <div 
                      className="text-yellow-500 mt-6 p-4 bg-yellow-900/30 rounded-lg max-w-lg"
                      style={{ 
                        fontSize: '14px',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      📹 <strong>To show video:</strong> Host can click &quot;Stream to Display&quot; in Camera Preview to stream their camera directly here.
                    </div>
                  </>
                ) : (
                  <>
                    <div 
                      className="font-bold mb-4 text-green-400"
                      style={{ 
                        fontSize: '36px',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      🟢 Match In Progress
                    </div>
                    <div 
                      className="text-white font-bold"
                      style={{ 
                        fontSize: '72px',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      {timerDisplay}
                    </div>
                    <div 
                      className={`font-bold mt-2 ${
                        eventData?.match_state === 'AUTONOMOUS' ? 'text-green-400' :
                        eventData?.match_state === 'TRANSITION' ? 'text-yellow-400' :
                        eventData?.match_state === 'TELEOP' ? 'text-blue-400' :
                        eventData?.match_state === 'END_GAME' ? 'text-orange-400' :
                        eventData?.match_state === 'FINISHED' ? 'text-red-400' :
                        eventData?.match_state === 'UNDER_REVIEW' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}
                      style={{ 
                        fontSize: '28px',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      {eventData?.match_state?.replace(/_/g, ' ')}
                    </div>
                    <div 
                      className="text-gray-500 mt-6"
                      style={{ 
                        fontSize: '14px',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      💡 No stream URL configured. Set one in host controls or use this as an OBS overlay.
                    </div>
                  </>
                )}
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
      
      {/* Hidden audio element for announcer audio streaming (full display mode)
          Note: This element only renders in full display mode. For camera mode,
          a similar element is rendered above. Only one mode is active at a time. */}
      <audio ref={announcerAudioRef} autoPlay style={{ display: 'none' }} />
      
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
      
      {/* Final Results Display (after video) - positioned above ScoreBar */}
      {!showWinnerVideo && eventData?.match_state === 'SCORES_RELEASED' && (
        <div 
          className="absolute left-0 right-0 top-0 z-30 flex flex-col items-center justify-center overflow-auto" 
          style={{ 
            backgroundColor: COLORS.BLACK,
            height: `${LAYOUT.VIDEO_AREA_HEIGHT_PERCENT}%`,
          }}
        >
          <div 
            className="text-white font-bold mb-4"
            style={{ 
              fontSize: '48px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            🏆 FINAL RESULTS 🏆
          </div>
          <div className="flex gap-16 mb-4">
            <div className="text-center">
              <div className="text-red-500 font-bold mb-1" style={{ fontSize: '28px' }}>RED ALLIANCE</div>
              <div className="text-white font-bold" style={{ fontSize: '80px' }}>
                {redTotal}
              </div>
              <div className="text-gray-400" style={{ fontSize: '18px' }}>
                {eventData?.red_team1 || '----'} + {eventData?.red_team2 || '----'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-blue-500 font-bold mb-1" style={{ fontSize: '28px' }}>BLUE ALLIANCE</div>
              <div className="text-white font-bold" style={{ fontSize: '80px' }}>
                {blueTotal}
              </div>
              <div className="text-gray-400" style={{ fontSize: '18px' }}>
                {eventData?.blue_team1 || '----'} + {eventData?.blue_team2 || '----'}
              </div>
            </div>
          </div>
          <div 
            className="text-yellow-400 font-bold mb-4 animate-pulse"
            style={{ fontSize: '36px' }}
          >
            {redTotal > blueTotal 
              ? '🔴 RED WINS! 🔴' 
              : blueTotal > redTotal
                ? '🔵 BLUE WINS! 🔵'
                : '🤝 TIE GAME! 🤝'
            }
          </div>
          
          {/* Score Breakdown Table */}
          <div className="flex gap-8">
            {/* Red Score Breakdown */}
            {(() => {
              const redBreakdown = calculateScoreBreakdown(redScore, blueScore);
              return (
                <div className="bg-red-900/50 rounded-lg p-4 min-w-[280px]">
                  <div className="text-red-300 font-bold text-center mb-3" style={{ fontSize: '20px' }}>RED BREAKDOWN</div>
                  <table className="w-full text-white" style={{ fontSize: '14px' }}>
                    <tbody>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">🚗 Auto Leave</td>
                        <td className="text-right font-bold">{redBreakdown.autoLeave}</td>
                      </tr>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">🟢 Auto Classified (×3)</td>
                        <td className="text-right font-bold">{redBreakdown.autoClassified}</td>
                      </tr>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">➕ Auto Overflow</td>
                        <td className="text-right font-bold">{redBreakdown.autoOverflow}</td>
                      </tr>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">✔ Auto Pattern (×2)</td>
                        <td className="text-right font-bold">{redBreakdown.autoPattern}</td>
                      </tr>
                      <tr className="border-b border-red-700/50 bg-red-800/30">
                        <td className="py-1 font-bold">Auto Subtotal</td>
                        <td className="text-right font-bold">{redBreakdown.autoTotal}</td>
                      </tr>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">🟢 Teleop Classified (×3)</td>
                        <td className="text-right font-bold">{redBreakdown.teleopClassified}</td>
                      </tr>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">➕ Teleop Overflow</td>
                        <td className="text-right font-bold">{redBreakdown.teleopOverflow}</td>
                      </tr>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">📦 Teleop Depot</td>
                        <td className="text-right font-bold">{redBreakdown.teleopDepot}</td>
                      </tr>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">✔ Teleop Pattern (×2)</td>
                        <td className="text-right font-bold">{redBreakdown.teleopPattern}</td>
                      </tr>
                      <tr className="border-b border-red-700/50 bg-red-800/30">
                        <td className="py-1 font-bold">Teleop Subtotal</td>
                        <td className="text-right font-bold">{redBreakdown.teleopTotal}</td>
                      </tr>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">🏠 BASE Return</td>
                        <td className="text-right font-bold">{redBreakdown.endgameBase}</td>
                      </tr>
                      <tr className="border-b border-red-700/50">
                        <td className="py-1">⚠ Opponent Penalties</td>
                        <td className="text-right font-bold text-green-400">+{redBreakdown.penaltyPoints}</td>
                      </tr>
                      <tr className="bg-red-700/50">
                        <td className="py-2 font-bold text-lg">TOTAL</td>
                        <td className="text-right font-bold text-lg">{redBreakdown.totalScore}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
            
            {/* Blue Score Breakdown */}
            {(() => {
              const blueBreakdown = calculateScoreBreakdown(blueScore, redScore);
              return (
                <div className="bg-blue-900/50 rounded-lg p-4 min-w-[280px]">
                  <div className="text-blue-300 font-bold text-center mb-3" style={{ fontSize: '20px' }}>BLUE BREAKDOWN</div>
                  <table className="w-full text-white" style={{ fontSize: '14px' }}>
                    <tbody>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">🚗 Auto Leave</td>
                        <td className="text-right font-bold">{blueBreakdown.autoLeave}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">🟢 Auto Classified (×3)</td>
                        <td className="text-right font-bold">{blueBreakdown.autoClassified}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">➕ Auto Overflow</td>
                        <td className="text-right font-bold">{blueBreakdown.autoOverflow}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">✔ Auto Pattern (×2)</td>
                        <td className="text-right font-bold">{blueBreakdown.autoPattern}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50 bg-blue-800/30">
                        <td className="py-1 font-bold">Auto Subtotal</td>
                        <td className="text-right font-bold">{blueBreakdown.autoTotal}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">🟢 Teleop Classified (×3)</td>
                        <td className="text-right font-bold">{blueBreakdown.teleopClassified}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">➕ Teleop Overflow</td>
                        <td className="text-right font-bold">{blueBreakdown.teleopOverflow}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">📦 Teleop Depot</td>
                        <td className="text-right font-bold">{blueBreakdown.teleopDepot}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">✔ Teleop Pattern (×2)</td>
                        <td className="text-right font-bold">{blueBreakdown.teleopPattern}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50 bg-blue-800/30">
                        <td className="py-1 font-bold">Teleop Subtotal</td>
                        <td className="text-right font-bold">{blueBreakdown.teleopTotal}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">🏠 BASE Return</td>
                        <td className="text-right font-bold">{blueBreakdown.endgameBase}</td>
                      </tr>
                      <tr className="border-b border-blue-700/50">
                        <td className="py-1">⚠ Opponent Penalties</td>
                        <td className="text-right font-bold text-green-400">+{blueBreakdown.penaltyPoints}</td>
                      </tr>
                      <tr className="bg-blue-700/50">
                        <td className="py-2 font-bold text-lg">TOTAL</td>
                        <td className="text-right font-bold text-lg">{blueBreakdown.totalScore}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
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
