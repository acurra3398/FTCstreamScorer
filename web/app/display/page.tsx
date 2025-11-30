'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ScoreBar from '@/components/ScoreBar';
import { 
  DecodeScore, 
  EventData, 
  MatchState,
  createDefaultScore, 
  extractRedScore, 
  extractBlueScore,
  calculateTotalWithPenalties,
  formatTimeDisplay,
  calculateScoreBreakdown,
} from '@/lib/supabase';
import { COLORS, LAYOUT, VIDEO_FILES, AUDIO_FILES, WEBRTC_CONFIG, WEBRTC_POLLING, AUDIO_VOLUMES, MATCH_TIMING } from '@/lib/constants';

// Audio service hook for managing match sounds on display page
function useDisplayAudioService() {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  
  useEffect(() => {
    // Preload audio files and set volume for sound effects
    Object.entries(AUDIO_FILES).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = AUDIO_VOLUMES.SOUND_EFFECTS; // Set sound effects to full volume
      audioRefs.current[key] = audio;
    });
    
    return () => {
      // Cleanup
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
        audio.onended = null;
      });
    };
  }, []);
  
  const playAudio = useCallback((key: string, onEnded?: () => void) => {
    const audio = audioRefs.current[key];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = AUDIO_VOLUMES.SOUND_EFFECTS;
      // Set up onended callback before playing
      if (onEnded) {
        audio.onended = () => {
          audio.onended = null; // Clean up listener
          onEnded();
        };
      } else {
        audio.onended = null;
      }
      audio.play().catch(err => {
        console.error('Audio playback failed:', err);
        // Still call onEnded even on error so sequence can continue
        if (onEnded) {
          audio.onended = null;
          onEnded();
        }
      });
    } else if (onEnded) {
      // Audio not found, still call callback
      onEnded();
    }
  }, []);
  
  return { playAudio };
}

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
  const videoReconnectAttemptsRef = useRef<number>(0);
  const audioReconnectAttemptsRef = useRef<number>(0);
  
  // Track if we've already triggered the video for this score release
  const hasTriggeredVideo = useRef(false);
  
  // Track previous match state for triggering sound effects
  const previousMatchStateRef = useRef<MatchState | null>(null);
  
  // Track previous countdown number for playing countdown audio
  const previousCountdownRef = useRef<number | null>(null);
  
  // Track last played transition countdown second to sync audio with visual timer
  const lastPlayedTransitionCountdownRef = useRef<number | null>(null);
  
  // Override to show camera after scores released
  const [showCameraOverride, setShowCameraOverride] = useState(false);
  
  // Audio service for playing sound effects
  const { playAudio } = useDisplayAudioService();
  
  // Ref for playAudio to use in interval callbacks
  const playAudioRef = useRef(playAudio);
  useEffect(() => {
    playAudioRef.current = playAudio;
  }, [playAudio]);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [redScore, setRedScore] = useState<DecodeScore>(createDefaultScore());
  const [blueScore, setBlueScore] = useState<DecodeScore>(createDefaultScore());
  const [eventData, setEventData] = useState<EventData | null>(null);
  
  // Timer state (runs independently after initial sync)
  const [timerDisplay, setTimerDisplay] = useState('--:--');
  
  // Store the initial timer start data when timer first starts
  // This allows the timer to run independently without re-syncing from server
  const timerStartDataRef = useRef<{
    startedAt: string;
    initialSeconds: number;
  } | null>(null);
  
  // Track previous timer running state to detect when timer starts
  const previousTimerRunningRef = useRef<boolean>(false);

  // Calculate timer based on stored start data (independent of server updates)
  const calculateIndependentTimer = useCallback((): number => {
    const startData = timerStartDataRef.current;
    if (!startData) return MATCH_TIMING.INITIAL_DISPLAY_TIME;
    
    const startTime = new Date(startData.startedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    return Math.max(0, startData.initialSeconds - elapsedSeconds);
  }, []);

  // Handle timer start - capture initial data for independent operation
  useEffect(() => {
    if (!eventData) return;
    
    const wasRunning = previousTimerRunningRef.current;
    const isNowRunning = eventData.timer_running && !eventData.timer_paused;
    
    // Detect timer start transition
    if (!wasRunning && isNowRunning && eventData.timer_started_at) {
      // Timer just started - capture the start data for independent operation
      timerStartDataRef.current = {
        startedAt: eventData.timer_started_at,
        initialSeconds: eventData.timer_seconds_remaining ?? MATCH_TIMING.INITIAL_DISPLAY_TIME,
      };
    }
    
    // If timer is not running and not started, reset display
    if (!eventData.timer_running && eventData.match_state === 'NOT_STARTED') {
      timerStartDataRef.current = null;
      setTimerDisplay(formatTimeDisplay(eventData.timer_seconds_remaining ?? MATCH_TIMING.INITIAL_DISPLAY_TIME));
    }
    
    previousTimerRunningRef.current = isNowRunning;
  }, [eventData?.timer_running, eventData?.timer_paused, eventData?.timer_started_at, eventData?.match_state, eventData?.timer_seconds_remaining]);
  
  // Local timer update effect - recalculates every 100ms for smooth display
  // Uses captured start data for independent operation (not synced from server)
  const eventDataRef = useRef(eventData);
  
  // Keep the ref in sync with the latest eventData
  useEffect(() => {
    eventDataRef.current = eventData;
  }, [eventData]);
  
  useEffect(() => {
    if (!eventData || !eventData.timer_running || eventData.timer_paused) {
      return;
    }
    
    const localTimer = setInterval(() => {
      const currentEventData = eventDataRef.current;
      if (currentEventData && currentEventData.timer_running && !currentEventData.timer_paused) {
        // Use independent timer calculation based on stored start data
        const seconds = calculateIndependentTimer();
        setTimerDisplay(formatTimeDisplay(seconds));
        
        // Note: During TRANSITION, the transition.mp3 audio already includes the 3-2-1 countdown
        // so we don't need to play a separate countdown audio here.
        // The lastPlayedTransitionCountdownRef is kept for future use if needed.
        if (currentEventData.match_state !== 'TRANSITION') {
          // Reset the ref when not in transition
          lastPlayedTransitionCountdownRef.current = null;
        }
      }
    }, 100);
    
    return () => clearInterval(localTimer);
  }, [eventData?.timer_running, eventData?.timer_paused, calculateIndependentTimer]);
  
  // Track match state changes and play appropriate sound effects
  // All sounds are played on the display page to ensure audio comes through display device
  useEffect(() => {
    if (!eventData) return;
    
    const currentState = eventData.match_state;
    const previousState = previousMatchStateRef.current;
    
    // Only trigger sounds on state change
    if (currentState !== previousState && previousState !== null) {
      // Play sounds based on state transitions
      switch (currentState) {
        case 'AUTONOMOUS':
          // Match started - play start match bell
          playAudio('startmatch');
          break;
        case 'TRANSITION':
          // Auto ended - play endauto sound first, then transition bells
          playAudio('endauto', () => {
            playAudio('transition');
          });
          break;
        case 'TELEOP':
          // Teleop started after transition - play start match bell
          playAudio('startmatch');
          break;
        case 'END_GAME':
          // End game started (20 seconds remaining) - play endgame warning
          playAudio('endgame');
          break;
        case 'FINISHED':
          // Match ended - play end match sound
          playAudio('endmatch');
          break;
        case 'NOT_STARTED':
          // Reset camera override when match state changes back to NOT_STARTED
          setShowCameraOverride(false);
          break;
      }
      
      previousMatchStateRef.current = currentState;
    } else if (previousState === null) {
      // First load - just store the current state without playing sounds
      previousMatchStateRef.current = currentState;
    }
  }, [eventData?.match_state, playAudio]);
  
  // Track countdown number changes for pre-match countdown audio
  useEffect(() => {
    if (!eventData) return;
    
    const currentCountdown = eventData.countdown_number ?? null;
    const previousCountdown = previousCountdownRef.current;
    
    // Play countdown audio when countdown starts (first number appears)
    if (currentCountdown === 3 && previousCountdown !== 3) {
      playAudio('countdown');
    }
    
    previousCountdownRef.current = currentCountdown;
  }, [eventData?.countdown_number, playAudio]);
  
  // Handle WebRTC audio streaming from host
  useEffect(() => {
    let isCleanedUp = false;
    let connectionTimeout: NodeJS.Timeout | null = null;
    
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
      console.log('New audio SDP offer received, setting up connection...');
      
      try {
        // Create peer connection for receiving audio
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
        }
        
        const pc = new RTCPeerConnection(WEBRTC_CONFIG);
        peerConnectionRef.current = pc;
        
        // Set a connection timeout - if we don't connect within timeout, retry
        connectionTimeout = setTimeout(() => {
          if (pc.connectionState !== 'connected' && !isCleanedUp) {
            console.log('Audio connection timeout, will retry on next poll');
            lastSdpOfferRef.current = ''; // Force retry on next poll
          }
        }, WEBRTC_POLLING.CONNECTION_TIMEOUT_MS);
        
        // Handle incoming audio track
        pc.ontrack = (event) => {
          console.log('Received audio track from host');
          if (announcerAudioRef.current && event.streams[0]) {
            announcerAudioRef.current.srcObject = event.streams[0];
            // Set stream audio volume to be lower so sound effects are more prominent
            announcerAudioRef.current.volume = AUDIO_VOLUMES.STREAM_AUDIO;
            announcerAudioRef.current.play().catch(err => {
              console.error('Audio play failed:', err);
              // Retry play after a short delay (autoplay policy workaround)
              setTimeout(() => {
                announcerAudioRef.current?.play().catch(console.error);
              }, 1000);
            });
          }
        };
        
        // Handle connection state changes with retry logic for audio
        pc.onconnectionstatechange = () => {
          console.log('Audio connection state:', pc.connectionState);
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          
          if (pc.connectionState === 'connected') {
            audioReconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
            console.log('Audio WebRTC connected successfully!');
          } else if (pc.connectionState === 'disconnected') {
            // Wait a bit before considering it failed - disconnected can be temporary
            setTimeout(() => {
              if (pc.connectionState === 'disconnected' && !isCleanedUp) {
                console.log('Audio still disconnected, triggering reconnect');
                lastSdpOfferRef.current = '';
              }
            }, 3000);
          } else if (pc.connectionState === 'failed') {
            // Attempt to reconnect if we haven't exceeded max attempts
            if (audioReconnectAttemptsRef.current < WEBRTC_POLLING.MAX_RECONNECT_ATTEMPTS) {
              audioReconnectAttemptsRef.current++;
              console.log(`Audio reconnect attempt ${audioReconnectAttemptsRef.current}/${WEBRTC_POLLING.MAX_RECONNECT_ATTEMPTS}`);
              // Clear the last SDP offer to force re-connection on next poll
              lastSdpOfferRef.current = '';
            }
          }
        };
        
        // Handle ICE connection state for better monitoring
        pc.oniceconnectionstatechange = () => {
          console.log('Audio ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed') {
            // Try ICE restart
            console.log('Audio ICE failed, will retry');
            lastSdpOfferRef.current = '';
          }
        };
        
        // Collect ICE candidates to send back to host
        const iceCandidates: RTCIceCandidate[] = [];
        let iceSendTimeout: NodeJS.Timeout | null = null;
        
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            iceCandidates.push(event.candidate);
            // Debounce sending ICE candidates - wait for more to accumulate
            if (iceSendTimeout) clearTimeout(iceSendTimeout);
            iceSendTimeout = setTimeout(async () => {
              try {
                await fetch(`/api/events/${encodeURIComponent(eventName)}/audio-answer`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    iceCandidates: JSON.stringify(iceCandidates.map(c => c.toJSON()))
                  }),
                });
              } catch (e) {
                console.error('Error sending audio ICE candidates:', e);
              }
            }, WEBRTC_POLLING.ICE_DEBOUNCE_MS);
          }
        };
        
        // Wait for ICE gathering to complete before sending answer
        pc.onicegatheringstatechange = async () => {
          console.log('Audio ICE gathering state:', pc.iceGatheringState);
          if (pc.iceGatheringState === 'complete' && pc.localDescription) {
            // Send final answer with all ICE candidates
            try {
              await fetch(`/api/events/${encodeURIComponent(eventName)}/audio-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  answer: JSON.stringify(pc.localDescription),
                  iceCandidates: JSON.stringify(iceCandidates.map(c => c.toJSON()))
                }),
              });
              console.log('Audio answer sent with complete ICE candidates');
            } catch (e) {
              console.error('Error sending final audio answer:', e);
            }
          }
        };
        
        // Set remote description (the offer from host)
        const offer = JSON.parse(data.audio_sdp_offer);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Add ICE candidates from host
        if (data.audio_ice_candidates) {
          try {
            const candidates = JSON.parse(data.audio_ice_candidates);
            for (const candidate of candidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                // Ignore errors for individual candidates - some may be duplicates
              }
            }
          } catch (e) {
            console.error('Error parsing audio ICE candidates:', e);
          }
        }
        
        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Send initial answer immediately (trickle ICE - candidates will follow)
        try {
          await fetch(`/api/events/${encodeURIComponent(eventName)}/audio-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              answer: JSON.stringify(answer)
            }),
          });
          console.log('Initial audio answer sent');
        } catch (e) {
          console.error('Error sending audio answer:', e);
        }
      } catch (err) {
        console.error('Error setting up audio receiver:', err);
        // Retry on error
        lastSdpOfferRef.current = '';
      }
    }
    
    if (eventData) {
      handleAudioStreaming(eventData);
    }
    
    return () => {
      isCleanedUp = true;
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [eventData?.audio_enabled, eventData?.audio_sdp_offer, eventData?.audio_ice_candidates, eventName]);
  
  // Handle WebRTC video streaming from host
  useEffect(() => {
    let isCleanedUp = false;
    let connectionTimeout: NodeJS.Timeout | null = null;
    
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
      console.log('New video SDP offer received, setting up connection...');
      
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
        
        const pc = new RTCPeerConnection(WEBRTC_CONFIG);
        videoPeerConnectionRef.current = pc;
        
        // Set a connection timeout - if we don't connect within 15 seconds, retry
        connectionTimeout = setTimeout(() => {
          if (pc.connectionState !== 'connected' && !isCleanedUp) {
            console.log('Video connection timeout, will retry on next poll');
            setVideoConnectionStatus('Connection timeout - retrying...');
            lastVideoSdpOfferRef.current = ''; // Force retry on next poll
          }
        }, WEBRTC_POLLING.CONNECTION_TIMEOUT_MS);
        
        // Handle incoming video track
        pc.ontrack = (event) => {
          console.log('Received video track from host');
          setHostVideoStream(event.streams[0]);
          setVideoConnectionStatus('Connected - Receiving video');
          
          if (hostVideoRef.current && event.streams[0]) {
            hostVideoRef.current.srcObject = event.streams[0];
            hostVideoRef.current.play().catch(err => {
              console.error('Video play failed:', err);
              // Retry play after a short delay (autoplay policy workaround)
              setTimeout(() => {
                hostVideoRef.current?.play().catch(console.error);
              }, 1000);
            });
          }
        };
        
        // Handle connection state changes with retry logic
        pc.onconnectionstatechange = () => {
          console.log('Video connection state:', pc.connectionState);
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          
          if (pc.connectionState === 'connected') {
            setVideoConnectionStatus('Connected');
            videoReconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
            console.log('Video WebRTC connected successfully!');
          } else if (pc.connectionState === 'disconnected') {
            setVideoConnectionStatus('Connection interrupted - waiting...');
            // Wait a bit before considering it failed - disconnected can be temporary
            setTimeout(() => {
              if (pc.connectionState === 'disconnected' && !isCleanedUp) {
                console.log('Video still disconnected, triggering reconnect');
                setVideoConnectionStatus('Reconnecting...');
                lastVideoSdpOfferRef.current = '';
              }
            }, 3000);
          } else if (pc.connectionState === 'failed') {
            setHostVideoStream(null);
            
            // Attempt to reconnect if we haven't exceeded max attempts
            if (videoReconnectAttemptsRef.current < WEBRTC_POLLING.MAX_RECONNECT_ATTEMPTS) {
              videoReconnectAttemptsRef.current++;
              console.log(`Video reconnect attempt ${videoReconnectAttemptsRef.current}/${WEBRTC_POLLING.MAX_RECONNECT_ATTEMPTS}`);
              setVideoConnectionStatus(`Reconnecting (${videoReconnectAttemptsRef.current}/${WEBRTC_POLLING.MAX_RECONNECT_ATTEMPTS})...`);
              // Clear the last SDP offer to force re-connection on next poll
              lastVideoSdpOfferRef.current = '';
            } else {
              setVideoConnectionStatus('Connection failed - please refresh the page');
            }
          }
        };
        
        // Handle ICE connection state for better monitoring
        pc.oniceconnectionstatechange = () => {
          console.log('Video ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed') {
            // Try ICE restart
            console.log('Video ICE failed, will retry');
            setVideoConnectionStatus('ICE connection failed - reconnecting...');
            lastVideoSdpOfferRef.current = '';
          }
        };
        
        // Collect ICE candidates to send back to host
        const iceCandidates: RTCIceCandidate[] = [];
        let iceSendTimeout: NodeJS.Timeout | null = null;
        
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            iceCandidates.push(event.candidate);
            // Debounce sending ICE candidates - wait for more to accumulate
            if (iceSendTimeout) clearTimeout(iceSendTimeout);
            iceSendTimeout = setTimeout(async () => {
              try {
                await fetch(`/api/events/${encodeURIComponent(eventName)}/video-answer`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    iceCandidates: JSON.stringify(iceCandidates.map(c => c.toJSON()))
                  }),
                });
              } catch (e) {
                console.error('Error sending video ICE candidates:', e);
              }
            }, WEBRTC_POLLING.ICE_DEBOUNCE_MS);
          }
        };
        
        // Wait for ICE gathering to complete before sending final answer
        pc.onicegatheringstatechange = async () => {
          console.log('Video ICE gathering state:', pc.iceGatheringState);
          if (pc.iceGatheringState === 'complete' && pc.localDescription) {
            // Send final answer with all ICE candidates
            try {
              await fetch(`/api/events/${encodeURIComponent(eventName)}/video-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  answer: JSON.stringify(pc.localDescription),
                  iceCandidates: JSON.stringify(iceCandidates.map(c => c.toJSON()))
                }),
              });
              console.log('Video answer sent with complete ICE candidates');
            } catch (e) {
              console.error('Error sending final video answer:', e);
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
                // Ignore errors for individual candidates - some may be duplicates
              }
            }
          } catch (parseErr) {
            console.error('Error parsing host ICE candidates:', parseErr);
          }
        }
        
        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Send initial answer immediately (trickle ICE - candidates will follow)
        try {
          await fetch(`/api/events/${encodeURIComponent(eventName)}/video-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              answer: JSON.stringify(answer)
            }),
          });
          setVideoConnectionStatus('Answer sent - waiting for connection...');
          console.log('Initial video answer sent');
        } catch (e) {
          console.error('Error sending video answer:', e);
          setVideoConnectionStatus('Error connecting');
        }
      } catch (err) {
        console.error('Error setting up video receiver:', err);
        setVideoConnectionStatus('Error: ' + (err instanceof Error ? err.message : 'Unknown'));
        // Retry on error
        lastVideoSdpOfferRef.current = '';
      }
    }
    
    if (eventData) {
      handleVideoStreaming(eventData);
    }
    
    return () => {
      isCleanedUp = true;
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (videoPeerConnectionRef.current) {
        videoPeerConnectionRef.current.close();
        videoPeerConnectionRef.current = null;
      }
    };
  }, [eventData?.video_enabled, eventData?.video_sdp_offer, eventData?.video_ice_candidates_host, eventName]);
  
  // Effect to attach video stream to video element when both are available
  // This handles the race condition where the stream arrives before the video element is mounted
  useEffect(() => {
    if (hostVideoStream && hostVideoRef.current) {
      hostVideoRef.current.srcObject = hostVideoStream;
      hostVideoRef.current.play().catch(console.error);
    }
  }, [hostVideoStream]);
  
  // Determine winner and show video when scores are released
  useEffect(() => {
    if (!eventData || eventData.match_state !== 'SCORES_RELEASED') {
      // Reset when not in SCORES_RELEASED state
      if (!eventData || eventData.match_state === 'NOT_STARTED') {
        hasTriggeredVideo.current = false;
        setShowWinnerVideo(false);
        setWinnerVideoSrc(null);
        setShowCameraOverride(false);
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
    
    // Play results audio using the audio service (for consistent volume)
    playAudio('results');
  }, [eventData?.match_state, redScore, blueScore, playAudio]);
  
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
        // Set initial timer display - timer will run independently after start
        setTimerDisplay(formatTimeDisplay(data.timer_seconds_remaining ?? MATCH_TIMING.INITIAL_DISPLAY_TIME));
        setCountdownDisplay(data.countdown_number ?? null);
        setShowCameraOverride(data.show_camera_override ?? false);
        setIsConnected(true);
        
      } catch (err) {
        setError('Connection failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    connect();
  }, [eventName]);

  // Poll for updates (timer runs independently - not updated from server)
  useEffect(() => {
    if (!isConnected || !eventName) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchEventAPI(eventName);
        if (data) {
          setEventData(data);
          setRedScore(extractRedScore(data));
          setBlueScore(extractBlueScore(data));
          // Note: Timer is NOT updated here - it runs independently after initial start
          // Update countdown display from database
          setCountdownDisplay(data.countdown_number ?? null);
          // Sync show camera override from host
          setShowCameraOverride(data.show_camera_override ?? false);
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
            transitionMessage={eventData?.transition_message}
          />
        </div>
      </div>
    );
  }

  // Camera mode - responsive layout with host camera/video on top and scores at bottom
  // Camera ALWAYS runs underneath - overlays (winner video, score breakdown) appear on top
  if (displayMode === 'camera') {
    return (
      <div 
        className="w-full h-screen flex flex-col overflow-hidden"
        style={{ 
          backgroundColor: COLORS.BLACK,
        }}
      >
        {/* Hidden audio element for announcer audio streaming (camera mode) 
            Note: This element only renders in camera mode. For full display mode, 
            a similar element is rendered below. Only one mode is active at a time. */}
        <audio ref={announcerAudioRef} autoPlay style={{ display: 'none' }} />
        
        {/* Host Camera / Video Area - takes up most of the screen (top section) */}
        <div 
          className="flex-1 flex items-center justify-center relative"
          style={{ 
            backgroundColor: COLORS.BLACK,
            minHeight: 0, // Allow flex shrinking
          }}
        >
          {/* Hidden audio element for results sound */}
          <audio ref={audioRef} preload="auto" />
          
          {/* BASE LAYER (z-0): Camera/video stream - ALWAYS visible underneath overlays */}
          <div className="absolute inset-0 z-0 flex items-center justify-center">
            {hostVideoStream ? (
              <video
                ref={hostVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
                style={{ backgroundColor: COLORS.BLACK }}
              />
            ) : eventData?.livestream_url && isValidLivestreamUrl(eventData.livestream_url) ? (
              <iframe
                src={eventData.livestream_url}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation"
              />
            ) : eventData?.livestream_url ? (
              <div className="text-yellow-500 text-center">
                <div className="font-bold mb-2" style={{ fontSize: '32px', fontFamily: 'Arial, sans-serif' }}>
                  ⚠️ Invalid Stream URL
                </div>
                <div style={{ fontSize: '18px', fontFamily: 'Arial, sans-serif' }}>
                  Only YouTube, Twitch, and Vimeo URLs are supported
                </div>
              </div>
            ) : eventData?.video_enabled ? (
              <div className="text-gray-400 text-center flex flex-col items-center justify-center h-full">
                <div className="font-bold mb-4 text-yellow-400" style={{ fontSize: '36px', fontFamily: 'Arial, sans-serif' }}>
                  📡 Connecting to Host Camera...
                </div>
                <div className="text-gray-500" style={{ fontSize: '18px', fontFamily: 'Arial, sans-serif' }}>
                  {videoConnectionStatus || 'Waiting for video stream...'}
                </div>
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-yellow-500"></div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center flex flex-col items-center justify-center h-full">
                {eventData?.match_state === 'NOT_STARTED' ? (
                  <>
                    <div className="font-bold mb-4" style={{ fontSize: '48px', fontFamily: 'Arial, sans-serif' }}>
                      ⏳ Match Ready
                    </div>
                    <div className="text-gray-500" style={{ fontSize: '24px', fontFamily: 'Arial, sans-serif' }}>
                      Waiting for host to start the match
                    </div>
                    <div className="text-gray-600 mt-4" style={{ fontSize: '16px', fontFamily: 'Arial, sans-serif' }}>
                      Event: {eventName}
                    </div>
                    <div className="text-yellow-500 mt-6 p-4 bg-yellow-900/30 rounded-lg max-w-lg" style={{ fontSize: '14px', fontFamily: 'Arial, sans-serif' }}>
                      📹 <strong>To show video:</strong> Host can click &quot;Stream to Display&quot; in Camera Preview to stream their camera directly here.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-bold mb-4 text-green-400" style={{ fontSize: '36px', fontFamily: 'Arial, sans-serif' }}>
                      🟢 Match In Progress
                    </div>
                    <div className="text-white font-bold" style={{ fontSize: '72px', fontFamily: 'Arial, sans-serif' }}>
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
                      style={{ fontSize: '28px', fontFamily: 'Arial, sans-serif' }}
                    >
                      {eventData?.match_state?.replace(/_/g, ' ')}
                    </div>
                    <div className="text-gray-500 mt-6" style={{ fontSize: '14px', fontFamily: 'Arial, sans-serif' }}>
                      💡 No stream URL configured. Set one in host controls or use this as an OBS overlay.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* OVERLAY LAYER (z-5): Finalizing Scores - appears ON TOP of camera when UNDER_REVIEW */}
          {eventData?.match_state === 'UNDER_REVIEW' && (
            <div className="absolute inset-0 z-5 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}>
              <div 
                className="text-yellow-400 font-bold animate-pulse text-center"
                style={{ 
                  fontSize: 'clamp(28px, 5vw, 64px)', 
                  fontFamily: 'Arial, sans-serif',
                  textShadow: '0 0 20px rgba(255, 200, 0, 0.5)',
                }}
              >
                ⏳ FINALIZING SCORES ⏳
              </div>
              <div 
                className="text-white mt-4"
                style={{ 
                  fontSize: 'clamp(14px, 2vw, 24px)', 
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Referees are reviewing scores...
              </div>
            </div>
          )}
          
          {/* OVERLAY LAYER (z-10): Final Results - appears ON TOP of camera when SCORES_RELEASED */}
          {!showWinnerVideo && eventData?.match_state === 'SCORES_RELEASED' && !showCameraOverride && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
              {/* Compact header */}
              <div className="text-white font-bold" style={{ fontSize: 'clamp(18px, 3vw, 32px)', fontFamily: 'Arial, sans-serif' }}>
                🏆 FINAL RESULTS 🏆
              </div>
              
              {/* Score summary - horizontal layout */}
              <div className="flex gap-4 md:gap-8 my-2">
                <div className="text-center">
                  <div className="text-red-500 font-bold" style={{ fontSize: 'clamp(12px, 2vw, 20px)' }}>RED</div>
                  <div className="text-white font-bold" style={{ fontSize: 'clamp(32px, 5vw, 60px)' }}>
                    {calculateTotalWithPenalties(redScore, blueScore)}
                  </div>
                  <div className="text-gray-400" style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}>
                    {eventData?.red_team1 || '----'} + {eventData?.red_team2 || '----'}
                  </div>
                </div>
                <div className="text-center flex items-center">
                  <div className="text-yellow-400 font-bold animate-pulse" style={{ fontSize: 'clamp(14px, 2vw, 24px)' }}>
                    {calculateTotalWithPenalties(redScore, blueScore) > calculateTotalWithPenalties(blueScore, redScore) 
                      ? '🔴 RED WINS!' 
                      : calculateTotalWithPenalties(blueScore, redScore) > calculateTotalWithPenalties(redScore, blueScore)
                        ? '🔵 BLUE WINS!'
                        : '🤝 TIE!'
                    }
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-blue-500 font-bold" style={{ fontSize: 'clamp(12px, 2vw, 20px)' }}>BLUE</div>
                  <div className="text-white font-bold" style={{ fontSize: 'clamp(32px, 5vw, 60px)' }}>
                    {calculateTotalWithPenalties(blueScore, redScore)}
                  </div>
                  <div className="text-gray-400" style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}>
                    {eventData?.blue_team1 || '----'} + {eventData?.blue_team2 || '----'}
                  </div>
                </div>
              </div>
              
              {/* Compact Score Breakdown - side by side, fits screen without scrolling */}
              <div className="flex gap-2 md:gap-4 w-full max-w-4xl px-2">
                {/* Red Score Breakdown - Compact */}
                {(() => {
                  const redBreakdown = calculateScoreBreakdown(redScore, blueScore);
                  return (
                    <div className="flex-1 bg-red-900/70 rounded p-1 md:p-2">
                      <div className="text-red-300 font-bold text-center" style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}>RED</div>
                      <div className="grid grid-cols-2 gap-x-1 text-white" style={{ fontSize: 'clamp(8px, 1vw, 11px)' }}>
                        <span>🚗 Leave</span><span className="text-right font-bold">{redBreakdown.autoLeave}</span>
                        <span>🟢 Classified</span><span className="text-right font-bold">{redBreakdown.autoClassified + redBreakdown.teleopClassified}</span>
                        <span>➕ Overflow</span><span className="text-right font-bold">{redBreakdown.autoOverflow + redBreakdown.teleopOverflow + redBreakdown.teleopDepot}</span>
                        <span>✔ Pattern</span><span className="text-right font-bold">{redBreakdown.autoPattern + redBreakdown.teleopPattern}</span>
                        <span>🏠 Base</span><span className="text-right font-bold">{redBreakdown.endgameBase}</span>
                        <span>⚠ Penalties</span><span className="text-right font-bold text-green-400">+{redBreakdown.penaltyPoints}</span>
                        <span className="font-bold border-t border-red-500 pt-1">TOTAL</span>
                        <span className="text-right font-bold border-t border-red-500 pt-1">{redBreakdown.totalScore}</span>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Blue Score Breakdown - Compact */}
                {(() => {
                  const blueBreakdown = calculateScoreBreakdown(blueScore, redScore);
                  return (
                    <div className="flex-1 bg-blue-900/70 rounded p-1 md:p-2">
                      <div className="text-blue-300 font-bold text-center" style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}>BLUE</div>
                      <div className="grid grid-cols-2 gap-x-1 text-white" style={{ fontSize: 'clamp(8px, 1vw, 11px)' }}>
                        <span>🚗 Leave</span><span className="text-right font-bold">{blueBreakdown.autoLeave}</span>
                        <span>🟢 Classified</span><span className="text-right font-bold">{blueBreakdown.autoClassified + blueBreakdown.teleopClassified}</span>
                        <span>➕ Overflow</span><span className="text-right font-bold">{blueBreakdown.autoOverflow + blueBreakdown.teleopOverflow + blueBreakdown.teleopDepot}</span>
                        <span>✔ Pattern</span><span className="text-right font-bold">{blueBreakdown.autoPattern + blueBreakdown.teleopPattern}</span>
                        <span>🏠 Base</span><span className="text-right font-bold">{blueBreakdown.endgameBase}</span>
                        <span>⚠ Penalties</span><span className="text-right font-bold text-green-400">+{blueBreakdown.penaltyPoints}</span>
                        <span className="font-bold border-t border-blue-500 pt-1">TOTAL</span>
                        <span className="text-right font-bold border-t border-blue-500 pt-1">{blueBreakdown.totalScore}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          
          {/* OVERLAY LAYER (z-20): Winner Video - appears ON TOP of everything during video playback */}
          {showWinnerVideo && winnerVideoSrc && (
            <div className="absolute inset-0 z-20">
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
        </div>

        {/* Score Bar at bottom - responsive height, always visible and not covered */}
        <div 
          className="w-full flex-shrink-0 z-30"
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
            transitionMessage={eventData?.transition_message}
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
      
      {/* Finalizing Scores Overlay - shown during UNDER_REVIEW state */}
      {eventData?.match_state === 'UNDER_REVIEW' && (
        <div 
          className="absolute left-0 right-0 top-0 z-35 flex flex-col items-center justify-center" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            height: `${LAYOUT.VIDEO_AREA_HEIGHT_PERCENT}%`,
          }}
        >
          <div 
            className="text-yellow-400 font-bold animate-pulse text-center"
            style={{ 
              fontSize: 'clamp(36px, 6vw, 80px)', 
              fontFamily: 'Arial, sans-serif',
              textShadow: '0 0 20px rgba(255, 200, 0, 0.5)',
            }}
          >
            ⏳ FINALIZING SCORES ⏳
          </div>
          <div 
            className="text-white mt-4"
            style={{ 
              fontSize: 'clamp(16px, 2vw, 28px)', 
              fontFamily: 'Arial, sans-serif',
            }}
          >
            Referees are reviewing scores...
          </div>
        </div>
      )}
      
      {/* Final Results Display (after video) - positioned above ScoreBar, compact to fit screen */}
      {!showWinnerVideo && eventData?.match_state === 'SCORES_RELEASED' && (
        <div 
          className="absolute left-0 right-0 top-0 z-30 flex flex-col items-center justify-center p-4" 
          style={{ 
            backgroundColor: COLORS.BLACK,
            height: `${LAYOUT.VIDEO_AREA_HEIGHT_PERCENT}%`,
          }}
        >
          {/* Compact header */}
          <div className="text-white font-bold" style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontFamily: 'Arial, sans-serif' }}>
            🏆 FINAL RESULTS 🏆
          </div>
          
          {/* Score summary - horizontal layout */}
          <div className="flex gap-8 md:gap-16 my-2">
            <div className="text-center">
              <div className="text-red-500 font-bold" style={{ fontSize: 'clamp(16px, 2.5vw, 24px)' }}>RED ALLIANCE</div>
              <div className="text-white font-bold" style={{ fontSize: 'clamp(48px, 8vw, 72px)' }}>
                {redTotal}
              </div>
              <div className="text-gray-400" style={{ fontSize: 'clamp(12px, 1.5vw, 16px)' }}>
                {eventData?.red_team1 || '----'} + {eventData?.red_team2 || '----'}
              </div>
            </div>
            <div className="text-center flex items-center">
              <div className="text-yellow-400 font-bold animate-pulse" style={{ fontSize: 'clamp(18px, 3vw, 32px)' }}>
                {redTotal > blueTotal 
                  ? '🔴 RED WINS!' 
                  : blueTotal > redTotal
                    ? '🔵 BLUE WINS!'
                    : '🤝 TIE!'
                }
              </div>
            </div>
            <div className="text-center">
              <div className="text-blue-500 font-bold" style={{ fontSize: 'clamp(16px, 2.5vw, 24px)' }}>BLUE ALLIANCE</div>
              <div className="text-white font-bold" style={{ fontSize: 'clamp(48px, 8vw, 72px)' }}>
                {blueTotal}
              </div>
              <div className="text-gray-400" style={{ fontSize: 'clamp(12px, 1.5vw, 16px)' }}>
                {eventData?.blue_team1 || '----'} + {eventData?.blue_team2 || '----'}
              </div>
            </div>
          </div>
          
          {/* Compact Score Breakdown - side by side */}
          <div className="flex gap-4 md:gap-8 w-full max-w-5xl px-4">
            {/* Red Score Breakdown - Compact */}
            {(() => {
              const redBreakdown = calculateScoreBreakdown(redScore, blueScore);
              return (
                <div className="flex-1 bg-red-900/70 rounded p-2 md:p-3">
                  <div className="text-red-300 font-bold text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 16px)' }}>RED BREAKDOWN</div>
                  <div className="grid grid-cols-2 gap-x-2 text-white" style={{ fontSize: 'clamp(10px, 1.2vw, 13px)' }}>
                    <span>🚗 Leave</span><span className="text-right font-bold">{redBreakdown.autoLeave}</span>
                    <span>🟢 Classified</span><span className="text-right font-bold">{redBreakdown.autoClassified + redBreakdown.teleopClassified}</span>
                    <span>➕ Overflow</span><span className="text-right font-bold">{redBreakdown.autoOverflow + redBreakdown.teleopOverflow + redBreakdown.teleopDepot}</span>
                    <span>✔ Pattern</span><span className="text-right font-bold">{redBreakdown.autoPattern + redBreakdown.teleopPattern}</span>
                    <span>🏠 Base</span><span className="text-right font-bold">{redBreakdown.endgameBase}</span>
                    <span>⚠ Penalties</span><span className="text-right font-bold text-green-400">+{redBreakdown.penaltyPoints}</span>
                    <span className="font-bold border-t border-red-500 pt-1">TOTAL</span>
                    <span className="text-right font-bold border-t border-red-500 pt-1">{redBreakdown.totalScore}</span>
                  </div>
                </div>
              );
            })()}
            
            {/* Blue Score Breakdown - Compact */}
            {(() => {
              const blueBreakdown = calculateScoreBreakdown(blueScore, redScore);
              return (
                <div className="flex-1 bg-blue-900/70 rounded p-2 md:p-3">
                  <div className="text-blue-300 font-bold text-center" style={{ fontSize: 'clamp(12px, 1.5vw, 16px)' }}>BLUE BREAKDOWN</div>
                  <div className="grid grid-cols-2 gap-x-2 text-white" style={{ fontSize: 'clamp(10px, 1.2vw, 13px)' }}>
                    <span>🚗 Leave</span><span className="text-right font-bold">{blueBreakdown.autoLeave}</span>
                    <span>🟢 Classified</span><span className="text-right font-bold">{blueBreakdown.autoClassified + blueBreakdown.teleopClassified}</span>
                    <span>➕ Overflow</span><span className="text-right font-bold">{blueBreakdown.autoOverflow + blueBreakdown.teleopOverflow + blueBreakdown.teleopDepot}</span>
                    <span>✔ Pattern</span><span className="text-right font-bold">{blueBreakdown.autoPattern + blueBreakdown.teleopPattern}</span>
                    <span>🏠 Base</span><span className="text-right font-bold">{blueBreakdown.endgameBase}</span>
                    <span>⚠ Penalties</span><span className="text-right font-bold text-green-400">+{blueBreakdown.penaltyPoints}</span>
                    <span className="font-bold border-t border-blue-500 pt-1">TOTAL</span>
                    <span className="text-right font-bold border-t border-blue-500 pt-1">{blueBreakdown.totalScore}</span>
                  </div>
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
        {/* Red Alliance Panel - smaller score display */}
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
              fontSize: 'clamp(14px, 2vw, 24px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            RED ALLIANCE
          </div>
          <div 
            className="text-white mb-2"
            style={{ 
              fontSize: 'clamp(10px, 1.2vw, 16px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {eventData?.red_team1 || '----'} + {eventData?.red_team2 || '----'}
          </div>
          <div 
            className="font-bold text-white"
            style={{ 
              fontSize: 'clamp(60px, 10vw, 140px)',
              lineHeight: 1,
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {redTotal}
          </div>
        </div>

        {/* Center Info Panel - BIGGER timer and motif */}
        <div 
          className="flex flex-col items-center justify-center"
          style={{ 
            backgroundColor: COLORS.WHITE,
            width: '25%',
            minWidth: '200px',
            maxWidth: '350px',
            padding: '2vh 1vw',
          }}
        >
          {/* Timer - MUCH BIGGER */}
          <div 
            className="font-bold text-black mb-2"
            style={{ 
              fontSize: 'clamp(48px, 8vw, 120px)',
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
              fontSize: 'clamp(18px, 2.5vw, 36px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {matchPhase === 'NOT_STARTED' ? 'READY' : matchPhase.replace(/_/g, ' ')}
          </div>
          
          {/* Motif - BIGGER with emoji circles */}
          <div 
            className="font-bold text-gray-600"
            style={{ 
              fontSize: 'clamp(24px, 3vw, 48px)',
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

        {/* Blue Alliance Panel - smaller score display */}
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
              fontSize: 'clamp(14px, 2vw, 24px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            BLUE ALLIANCE
          </div>
          <div 
            className="text-white mb-2"
            style={{ 
              fontSize: 'clamp(10px, 1.2vw, 16px)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {eventData?.blue_team1 || '----'} + {eventData?.blue_team2 || '----'}
          </div>
          <div 
            className="font-bold text-white"
            style={{ 
              fontSize: 'clamp(60px, 10vw, 140px)',
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
            transitionMessage={eventData?.transition_message}
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
