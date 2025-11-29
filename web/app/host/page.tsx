'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ScoreBar from '@/components/ScoreBar';
import ScoringControls from '@/components/ScoringControls';
import MatchHistory from '@/components/MatchHistory';
import { 
  DecodeScore, 
  EventData, 
  MatchRecord,
  MatchState,
  MotifType,
  BaseStatus,
  createDefaultScore, 
  extractRedScore, 
  extractBlueScore,
  calculateTotalWithPenalties,
} from '@/lib/supabase';
import { COLORS, MOTIF_NAMES, VALID_MOTIFS, MATCH_TIMING, AUDIO_FILES, VIDEO_FILES, WEBRTC_CONFIG, WEBRTC_POLLING, AUDIO_VOLUMES } from '@/lib/constants';

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
      // Clear any previous onended handler
      audio.onended = null;
      audio.currentTime = 0;
      // Ensure volume is set to full for sound effects
      audio.volume = AUDIO_VOLUMES.SOUND_EFFECTS;
      
      if (onEnded) {
        // Use addEventListener for more reliable callback
        const handleEnded = () => {
          audio.removeEventListener('ended', handleEnded);
          onEnded();
        };
        audio.addEventListener('ended', handleEnded);
      }
      
      audio.play().catch(err => {
        console.error('Audio playback failed:', err);
        // If audio fails to play, still call the callback after a short delay
        // This ensures the match flow continues even if audio doesn't work
        if (onEnded) {
          setTimeout(onEnded, 100);
        }
      });
    } else if (onEnded) {
      // No audio element, call callback immediately
      onEnded();
    }
  }, []);
  
  const stopAll = useCallback(() => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
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
  const [cameraStreaming, setCameraStreaming] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string>('');
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoPeerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(MATCH_TIMING.AUTO_DURATION);
  const [matchPhase, setMatchPhase] = useState<MatchState>('NOT_STARTED');
  const [totalElapsed, setTotalElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waitingForSound = useRef(false);
  
  // Audio streaming state for announcer microphone
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioStatus, setAudioStatus] = useState<string>('');
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
  // Match recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string>('');
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordedMatchNumber, setRecordedMatchNumber] = useState<number | null>(null);
  const [recordedFileExtension, setRecordedFileExtension] = useState<string>('mp4');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Show score editing tab
  const [showScoreEdit, setShowScoreEdit] = useState(false);
  
  // Show camera on display control (host controls what display shows after results)
  const [showCameraOnDisplay, setShowCameraOnDisplay] = useState(false);
  
  const { playAudio, stopAll } = useAudioService();

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle score change for host editing
  const handleScoreChange = useCallback(async (
    alliance: 'RED' | 'BLUE',
    field: keyof DecodeScore,
    value: number | boolean | BaseStatus
  ) => {
    const updateFn = alliance === 'RED' ? setRedScore : setBlueScore;
    
    // Update local state immediately
    updateFn(prev => ({
      ...prev,
      [field]: value,
    }));

    // Send to server via API
    try {
      await updateEventScoresAPI(eventName, alliance, { [field]: value });
    } catch (err) {
      console.error('Failed to update score:', err);
    }
  }, [eventName]);
  
  // Release final scores with video display
  const handleReleaseFinalScores = async () => {
    if (!eventData) return;
    
    const redTotal = calculateTotalWithPenalties(redScore, blueScore);
    const blueTotal = calculateTotalWithPenalties(blueScore, redScore);
    
    // Set match state to SCORES_RELEASED
    await hostActionAPI(eventName, password, 'setMatchState', { matchState: 'SCORES_RELEASED' });
    setMatchPhase('SCORES_RELEASED');
    
    // Auto-stop recording when results are released
    if (isRecording) {
      stopRecording();
    }
    
    // Play results sound
    playAudio('results');
    
    setActionStatus(`Final scores released! ${
      redTotal > blueTotal ? 'RED WINS!' : 
      blueTotal > redTotal ? 'BLUE WINS!' : 
      'TIE!'
    } Red: ${redTotal}, Blue: ${blueTotal}`);
  };
  
  // Toggle show camera on display (after results are released)
  const handleToggleCameraOnDisplay = async () => {
    const newValue = !showCameraOnDisplay;
    setShowCameraOnDisplay(newValue);
    await hostActionAPI(eventName, password, 'setShowCamera', { showCamera: newValue });
    setActionStatus(newValue ? 'Display now showing camera' : 'Display now showing final scores');
  };
  
  // Start recording match video/audio
  const startRecording = useCallback(() => {
    // Create a combined stream from camera and audio (if available)
    const tracks: MediaStreamTrack[] = [];
    
    if (cameraStream) {
      cameraStream.getVideoTracks().forEach(track => tracks.push(track));
    }
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => tracks.push(track));
    }
    
    if (tracks.length === 0) {
      setRecordingStatus('No camera or microphone available for recording');
      return;
    }
    
    const combinedStream = new MediaStream(tracks);
    
    try {
      // Try to use MP4 first (supported in Safari, some Chrome versions), fallback to WebM
      let mimeType = 'video/mp4';
      let fileExtension = 'mp4';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to WebM with VP9/Opus codecs for better quality
        mimeType = 'video/webm;codecs=vp9,opus';
        fileExtension = 'webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8,opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        // 2.5 Mbps provides a good balance between quality and file size for match recordings
        // (720p quality at ~3 minutes match duration = ~55MB file)
        videoBitsPerSecond: 2500000,
      });
      
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        setRecordedMatchNumber(matchHistory.length + 1);
        // Store the file extension for download
        setRecordedFileExtension(fileExtension);
        setRecordingStatus(`Recording saved as ${fileExtension.toUpperCase()}! Click download to save.`);
        setIsRecording(false);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setRecordingStatus('Recording error occurred');
        setIsRecording(false);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingStatus(`🔴 Recording match (${fileExtension.toUpperCase()})...`);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setRecordingStatus('Failed to start recording: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [cameraStream, audioStream, matchHistory.length]);
  
  // Start screen recording (captures display with score bar and sound effects)
  const startScreenRecording = useCallback(async () => {
    try {
      setRecordingStatus('Requesting screen capture permission...');
      
      // Request screen capture with system audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        },
        audio: true, // Capture system audio (including sound effects)
      });
      
      // Also capture microphone if available
      let micStream: MediaStream | null = null;
      if (selectedMicrophone) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: selectedMicrophone } }
          });
        } catch {
          console.log('Could not capture microphone for screen recording');
        }
      }
      
      // Combine streams
      const tracks: MediaStreamTrack[] = [...displayStream.getTracks()];
      if (micStream) {
        micStream.getAudioTracks().forEach(track => tracks.push(track));
      }
      
      const combinedStream = new MediaStream(tracks);
      
      // Try to use WebM with VP9/Opus codecs for best quality
      let mimeType = 'video/webm;codecs=vp9,opus';
      let fileExtension = 'webm';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }
      
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 4000000, // Higher bitrate for screen recording
      });
      
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Stop all display tracks
        displayStream.getTracks().forEach(track => track.stop());
        if (micStream) {
          micStream.getTracks().forEach(track => track.stop());
        }
        
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        setRecordedMatchNumber(matchHistory.length + 1);
        setRecordedFileExtension(fileExtension);
        setRecordingStatus(`Screen recording saved! Click download to save.`);
        setIsRecording(false);
      };
      
      // Handle when user stops sharing
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('Screen recording error:', event);
        setRecordingStatus('Screen recording error occurred');
        setIsRecording(false);
        displayStream.getTracks().forEach(track => track.stop());
        if (micStream) {
          micStream.getTracks().forEach(track => track.stop());
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingStatus(`🔴 Screen recording (includes score bar & sounds)...`);
      
    } catch (err) {
      console.error('Error starting screen recording:', err);
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setRecordingStatus('Screen capture permission denied');
      } else {
        setRecordingStatus('Failed to start screen recording: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  }, [matchHistory.length, selectedMicrophone]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecordingStatus('Processing recording...');
    }
  }, []);
  
  // Download recorded match
  const downloadRecording = useCallback(() => {
    if (!recordedBlobUrl) return;
    
    // Sanitize eventName for safe filename (remove special characters)
    const safeEventName = eventName.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    const a = document.createElement('a');
    a.href = recordedBlobUrl;
    a.download = `match_${recordedMatchNumber || 'unknown'}_${safeEventName}_${new Date().toISOString().slice(0, 10)}.${recordedFileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [recordedBlobUrl, recordedMatchNumber, eventName, recordedFileExtension]);
  
  // Clear recorded video
  const clearRecording = useCallback(() => {
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
    }
    setRecordedBlobUrl(null);
    setRecordedMatchNumber(null);
    setRecordedFileExtension('mp4');
    setRecordingStatus('');
  }, [recordedBlobUrl]);

  // Load available cameras
  useEffect(() => {
    async function loadCameras() {
      try {
        // Request permission first, then stop the stream to free resources
        const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
        permissionStream.getTracks().forEach(track => track.stop());
        
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
  
  // Load available microphones for announcer audio
  useEffect(() => {
    async function loadMicrophones() {
      try {
        // Request permission first, then stop the stream to free resources
        const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        permissionStream.getTracks().forEach(track => track.stop());
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const microphones = devices.filter(device => device.kind === 'audioinput');
        setAvailableMicrophones(microphones);
        if (microphones.length > 0 && !selectedMicrophone) {
          setSelectedMicrophone(microphones[0].deviceId);
        }
      } catch (err) {
        console.error('Error loading microphones:', err);
      }
    }
    loadMicrophones();
  }, []);
  
  // Handle audio streaming toggle
  const handleAudioToggle = async () => {
    if (audioEnabled) {
      // Stop audio streaming
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setAudioEnabled(false);
      setAudioStatus('Audio streaming stopped');
      
      // Update database to disable audio
      await hostActionAPI(eventName, password, 'setAudioState', { 
        audioEnabled: false,
        audioSdpOffer: '',
        audioSdpAnswer: '',
        audioIceCandidates: '[]',
      });
    } else {
      // Start audio streaming
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined }
        });
        setAudioStream(stream);
        setAudioEnabled(true);
        setAudioStatus('🎙️ Initializing audio connection...');
        
        // Create WebRTC peer connection for audio
        const pc = new RTCPeerConnection(WEBRTC_CONFIG);
        peerConnectionRef.current = pc;
        
        // Add audio track to connection
        stream.getAudioTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
        
        // Handle ICE candidates with debouncing for reliability
        const iceCandidates: RTCIceCandidate[] = [];
        let iceSendTimeout: NodeJS.Timeout | null = null;
        
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            iceCandidates.push(event.candidate);
            // Debounce sending ICE candidates
            if (iceSendTimeout) clearTimeout(iceSendTimeout);
            iceSendTimeout = setTimeout(async () => {
              try {
                await hostActionAPI(eventName, password, 'setAudioState', { 
                  audioIceCandidates: JSON.stringify(iceCandidates.map(c => c.toJSON())),
                });
              } catch (e) {
                console.error('Error sending audio ICE candidates:', e);
              }
            }, WEBRTC_POLLING.ICE_DEBOUNCE_MS);
          }
        };
        
        // Monitor ICE gathering state for reliability
        pc.onicegatheringstatechange = () => {
          console.log('Audio ICE gathering state:', pc.iceGatheringState);
          if (pc.iceGatheringState === 'complete') {
            // Send final ICE candidates when gathering is complete
            hostActionAPI(eventName, password, 'setAudioState', { 
              audioIceCandidates: JSON.stringify(iceCandidates.map(c => c.toJSON())),
            }).catch(console.error);
          }
        };
        
        // Handle ICE connection state for better monitoring
        pc.oniceconnectionstatechange = () => {
          console.log('Audio ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected') {
            setAudioStatus('🎙️ Audio streaming - LIVE');
          } else if (pc.iceConnectionState === 'disconnected') {
            setAudioStatus('⚠️ Audio connection interrupted - waiting...');
          } else if (pc.iceConnectionState === 'failed') {
            setAudioStatus('❌ Audio connection failed - try restarting');
          }
        };
        
        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          console.log('Audio connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setAudioStatus('🎙️ Audio streaming - Connected to display!');
          } else if (pc.connectionState === 'disconnected') {
            setAudioStatus('⚠️ Audio connection interrupted');
          } else if (pc.connectionState === 'failed') {
            setAudioStatus('❌ Audio connection failed');
          }
        };
        
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Store offer in database for display to pick up
        await hostActionAPI(eventName, password, 'setAudioState', { 
          audioEnabled: true,
          audioSdpOffer: JSON.stringify(offer),
          audioSdpAnswer: '', // Clear any old answer
          audioIceCandidatesDisplay: '[]', // Clear any old display candidates
        });
        
        setAudioStatus('🎙️ Waiting for display to connect...');
        
        // Poll for display's answer with timeout
        let pollAttempts = 0;
        let connectionEstablished = false;
        const pollForAnswer = setInterval(async () => {
          pollAttempts++;
          
          // Timeout after max attempts
          if (pollAttempts > WEBRTC_POLLING.MAX_ATTEMPTS) {
            clearInterval(pollForAnswer);
            if (!connectionEstablished) {
              setAudioStatus('⏱️ Connection timeout - Display may not be connected');
            }
            return;
          }
          
          try {
            const data = await fetchEventAPI(eventName);
            if (data?.audio_sdp_answer && pc.signalingState === 'have-local-offer') {
              // Display has sent an answer
              try {
                const answer = JSON.parse(data.audio_sdp_answer);
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                connectionEstablished = true;
                setAudioStatus('🎙️ Audio streaming - Establishing...');
                
                // Add display's ICE candidates
                if (data.audio_ice_candidates_display) {
                  try {
                    const displayCandidates = JSON.parse(data.audio_ice_candidates_display);
                    for (const candidate of displayCandidates) {
                      try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                      } catch (e) {
                        // Ignore InvalidStateError for duplicate or already-added ICE candidates
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing display audio ICE candidates:', e);
                  }
                }
              } catch (e) {
                console.error('Error parsing audio SDP answer:', e);
              }
              
              clearInterval(pollForAnswer);
            } else if (connectionEstablished && data?.audio_ice_candidates_display) {
              // Keep adding new ICE candidates even after connection established
              try {
                const displayCandidates = JSON.parse(data.audio_ice_candidates_display);
                for (const candidate of displayCandidates) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                  } catch (e) {
                    // Ignore InvalidStateError for duplicate or already-added ICE candidates
                  }
                }
              } catch (e) {
                // Ignore JSON parsing errors for malformed ICE candidate data
              }
            }
          } catch (err) {
            console.error('Error polling for audio answer:', err);
          }
        }, WEBRTC_POLLING.INTERVAL_MS);
        
        // Store interval ID for cleanup
        const currentPollRef = { interval: pollForAnswer };
        
        // Cleanup on stop - store reference in closure for the stop handler
        const originalClose = pc.close.bind(pc);
        pc.close = () => {
          clearInterval(currentPollRef.interval);
          if (iceSendTimeout) clearTimeout(iceSendTimeout);
          originalClose();
        };
        
      } catch (err) {
        console.error('Error starting audio:', err);
        setAudioStatus('Failed to start audio: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  };
  
  // Handle video streaming toggle
  const handleVideoStreamingToggle = async () => {
    if (cameraStreaming) {
      // Stop video streaming
      if (videoPeerConnectionRef.current) {
        videoPeerConnectionRef.current.close();
        videoPeerConnectionRef.current = null;
      }
      setCameraStreaming(false);
      setCameraStatus('Video streaming stopped');
      
      // Update database to disable video
      await hostActionAPI(eventName, password, 'setVideoState', { 
        videoEnabled: false,
        videoSdpOffer: '',
        videoSdpAnswer: '',
        videoIceCandidatesHost: '[]',
        videoIceCandidatesDisplay: '[]',
      });
    } else if (cameraStream) {
      // Start video streaming with existing camera stream
      try {
        setCameraStatus('📹 Initializing video connection...');
        
        // Create WebRTC peer connection for video
        const pc = new RTCPeerConnection(WEBRTC_CONFIG);
        videoPeerConnectionRef.current = pc;
        
        // Add video track to connection
        cameraStream.getVideoTracks().forEach(track => {
          pc.addTrack(track, cameraStream);
        });
        
        // Handle ICE candidates with debouncing for reliability
        const iceCandidates: RTCIceCandidate[] = [];
        let iceSendTimeout: NodeJS.Timeout | null = null;
        
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            iceCandidates.push(event.candidate);
            // Debounce sending ICE candidates
            if (iceSendTimeout) clearTimeout(iceSendTimeout);
            iceSendTimeout = setTimeout(async () => {
              try {
                await hostActionAPI(eventName, password, 'setVideoState', { 
                  videoIceCandidatesHost: JSON.stringify(iceCandidates.map(c => c.toJSON())),
                });
              } catch (e) {
                console.error('Error sending video ICE candidates:', e);
              }
            }, WEBRTC_POLLING.ICE_DEBOUNCE_MS);
          }
        };
        
        // Monitor ICE gathering state for reliability
        pc.onicegatheringstatechange = () => {
          console.log('Video ICE gathering state:', pc.iceGatheringState);
          if (pc.iceGatheringState === 'complete') {
            // Send final ICE candidates when gathering is complete
            hostActionAPI(eventName, password, 'setVideoState', { 
              videoIceCandidatesHost: JSON.stringify(iceCandidates.map(c => c.toJSON())),
            }).catch(console.error);
          }
        };
        
        // Handle ICE connection state for better monitoring
        pc.oniceconnectionstatechange = () => {
          console.log('Video ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected') {
            setCameraStatus('📹 Video streaming - LIVE');
          } else if (pc.iceConnectionState === 'disconnected') {
            setCameraStatus('⚠️ Video connection interrupted - waiting...');
          } else if (pc.iceConnectionState === 'failed') {
            setCameraStatus('❌ Video connection failed - try restarting');
          }
        };
        
        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          console.log('Video connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            setCameraStatus('📹 Video streaming - Connected to display!');
          } else if (pc.connectionState === 'disconnected') {
            setCameraStatus('⚠️ Video connection interrupted');
          } else if (pc.connectionState === 'failed') {
            setCameraStatus('❌ Video connection failed');
          }
        };
        
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Store offer in database for display to pick up
        await hostActionAPI(eventName, password, 'setVideoState', { 
          videoEnabled: true,
          videoSdpOffer: JSON.stringify(offer),
          videoSdpAnswer: '', // Clear any old answer
          videoIceCandidatesDisplay: '[]', // Clear any old display candidates
        });
        
        setCameraStreaming(true);
        setCameraStatus('📹 Waiting for display to connect...');
        
        // Poll for display's answer with timeout
        let pollAttempts = 0;
        let connectionEstablished = false;
        const pollForAnswer = setInterval(async () => {
          pollAttempts++;
          
          // Timeout after max attempts
          if (pollAttempts > WEBRTC_POLLING.MAX_ATTEMPTS) {
            clearInterval(pollForAnswer);
            if (!connectionEstablished) {
              setCameraStatus('⏱️ Connection timeout - Display may not be connected');
            }
            return;
          }
          
          try {
            const data = await fetchEventAPI(eventName);
            if (data?.video_sdp_answer && pc.signalingState === 'have-local-offer') {
              // Display has sent an answer
              try {
                const answer = JSON.parse(data.video_sdp_answer);
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                connectionEstablished = true;
                setCameraStatus('📹 Video streaming - Establishing...');
                
                // Add display's ICE candidates
                if (data.video_ice_candidates_display) {
                  try {
                    const displayCandidates = JSON.parse(data.video_ice_candidates_display);
                    for (const candidate of displayCandidates) {
                      try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                      } catch (e) {
                        // Ignore InvalidStateError for duplicate or already-added ICE candidates
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing display ICE candidates:', e);
                  }
                }
              } catch (e) {
                console.error('Error parsing video SDP answer:', e);
              }
              
              clearInterval(pollForAnswer);
            } else if (connectionEstablished && data?.video_ice_candidates_display) {
              // Keep adding new ICE candidates even after connection established
              try {
                const displayCandidates = JSON.parse(data.video_ice_candidates_display);
                for (const candidate of displayCandidates) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                  } catch (e) {
                    // Ignore InvalidStateError for duplicate or already-added ICE candidates
                  }
                }
              } catch (e) {
                // Ignore JSON parsing errors for malformed ICE candidate data
              }
            }
          } catch (err) {
            console.error('Error polling for video answer:', err);
          }
        }, WEBRTC_POLLING.INTERVAL_MS);
        
        // Store interval ID in a ref for proper cleanup on component unmount
        const currentPollRef = { interval: pollForAnswer };
        
        // Cleanup on stop - store reference in closure for the stop handler
        const originalClose = pc.close.bind(pc);
        pc.close = () => {
          clearInterval(currentPollRef.interval);
          if (iceSendTimeout) clearTimeout(iceSendTimeout);
          originalClose();
        };
        
      } catch (err) {
        console.error('Error starting video stream:', err);
        setCameraStatus('Failed to start video: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    } else {
      setCameraStatus('Please start the camera preview first');
    }
  };

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
      
      if (remaining <= 0) {
        // Transition immediately - don't wait for sound to finish
        // Play only the transition bells sound (not endauto)
        playAudio('transition');
        setMatchPhase('TRANSITION');
        setTotalElapsed(0);
        setSecondsRemaining(MATCH_TIMING.TRANSITION_DURATION);
        hostActionAPI(eventName, password, 'setMatchState', { matchState: 'TRANSITION' }).catch(console.error);
        hostActionAPI(eventName, password, 'updateTimerState', { 
          timerSecondsRemaining: MATCH_TIMING.TRANSITION_DURATION,
        }).catch(console.error);
      }
    } else if (matchPhase === 'TRANSITION') {
      const remaining = MATCH_TIMING.TRANSITION_DURATION - totalElapsed - 1;
      setSecondsRemaining(remaining);
      
      // Determine transition message based on remaining time
      // Show "DRIVERS PICK UP CONTROLLERS" until countdown starts, then show 3, 2, 1
      let transitionMessage: string | null = null;
      if (remaining > MATCH_TIMING.TRANSITION_COUNTDOWN_START) {
        transitionMessage = 'DRIVERS PICK UP CONTROLLERS';
      } else if (remaining > 0) {
        transitionMessage = String(remaining);
        // Play countdown sound at 3, 2, 1
        if (remaining === MATCH_TIMING.TRANSITION_COUNTDOWN_START) {
          playAudio('countdown');
        }
      }
      
      // Sync timer and transition message to database
      hostActionAPI(eventName, password, 'updateTimerState', { 
        timerSecondsRemaining: remaining,
        transitionMessage: transitionMessage,
      }).catch(console.error);
      
      if (remaining <= 0) {
        // Play start match bell sound when teleop begins
        playAudio('startmatch');
        setMatchPhase('TELEOP');
        setTotalElapsed(0);
        setSecondsRemaining(MATCH_TIMING.TELEOP_DURATION);
        hostActionAPI(eventName, password, 'setMatchState', { matchState: 'TELEOP' }).catch(console.error);
        hostActionAPI(eventName, password, 'updateTimerState', { 
          timerSecondsRemaining: MATCH_TIMING.TELEOP_DURATION,
          transitionMessage: null,
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

  // Start match with 3-2-1 countdown synced to sound
  const handleStart = async () => {
    if (timerRunning) return;
    
    // Reset everything for new match
    setTotalElapsed(0);
    setSecondsRemaining(MATCH_TIMING.AUTO_DURATION);
    waitingForSound.current = true;
    setActionStatus('Match starting with countdown...');
    
    // Clear any previous recording
    clearRecording();
    
    // Use constants for countdown sequence
    const countdownNumbers = MATCH_TIMING.COUNTDOWN_NUMBERS;
    let countdownIndex = 0;
    
    // Show first countdown number immediately and play countdown audio in sync
    hostActionAPI(eventName, password, 'setCountdown', { 
      countdownNumber: countdownNumbers[countdownIndex] 
    }).catch(console.error);
    
    // Play countdown audio immediately with visual
    playAudio('countdown');
    
    // Visual countdown updates every second, synced with the audio
    const countdownInterval = setInterval(async () => {
      countdownIndex++;
      if (countdownIndex < countdownNumbers.length) {
        const currentNumber = countdownNumbers[countdownIndex];
        // Sync countdown to database for display and referee tablets
        hostActionAPI(eventName, password, 'setCountdown', { countdownNumber: currentNumber }).catch(console.error);
      } else {
        // Visual countdown finished (after showing 1) - clear interval
        clearInterval(countdownInterval);
        
        // After 321 countdown completes, play the start/bell sound and begin match
        setTimeout(() => {
          // Clear the countdown display
          hostActionAPI(eventName, password, 'setCountdown', { countdownNumber: null }).catch(console.error);
          
          // Play the start match bell sound
          playAudio('startmatch');
          
          // Start the match immediately after countdown
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
          
          setActionStatus('Match started! Autonomous period.');
        }, MATCH_TIMING.COUNTDOWN_INTERVAL_MS); // Wait 1 second after "1" before starting
      }
    }, MATCH_TIMING.COUNTDOWN_INTERVAL_MS);
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

  // Reset scores for new match
  const resetScores = async () => {
    if (!confirm('Reset all scores for a new match? This cannot be undone.')) return;
    
    await handleStop();
    
    const result = await hostActionAPI(eventName, password, 'resetScores');
    setActionStatus(result.message);
    if (result.success) {
      setRedScore(createDefaultScore());
      setBlueScore(createDefaultScore());
      const data = await fetchEventAPI(eventName);
      if (data) setEventData(data);
    }
  };

  // Full match reset - resets everything for a completely new match
  // Note: Camera keeps running - we just hide the score overlay to reveal it
  const resetMatch = async () => {
    if (!confirm('Reset entire match? This will reset scores, teams, timer, and hide the results overlay. This cannot be undone.')) return;
    
    // Stop any running timer
    await handleStop();
    
    // Reset scores
    await hostActionAPI(eventName, password, 'resetScores');
    setRedScore(createDefaultScore());
    setBlueScore(createDefaultScore());
    
    // Reset teams
    setRedTeam1('');
    setRedTeam2('');
    setBlueTeam1('');
    setBlueTeam2('');
    await hostActionAPI(eventName, password, 'setTeams', {
      redTeam1: '',
      redTeam2: '',
      blueTeam1: '',
      blueTeam2: '',
    });
    
    // Reset match state and timer - this will hide the results overlay on display
    // The camera continues running underneath - we're just removing the overlay
    setMatchPhase('NOT_STARTED');
    setSecondsRemaining(MATCH_TIMING.AUTO_DURATION);
    setTotalElapsed(0);
    await hostActionAPI(eventName, password, 'setMatchState', { matchState: 'NOT_STARTED' });
    await hostActionAPI(eventName, password, 'updateTimerState', { 
      timerRunning: false,
      timerPaused: false,
      timerSecondsRemaining: MATCH_TIMING.AUTO_DURATION,
    });
    
    // Clear any countdown
    await hostActionAPI(eventName, password, 'setCountdown', { countdownNumber: null });
    
    // Hide the results overlay - camera is always underneath
    setShowCameraOnDisplay(false);
    await hostActionAPI(eventName, password, 'setShowCamera', { showCamera: false });
    
    // Refresh event data
    const data = await fetchEventAPI(eventName);
    if (data) setEventData(data);
    
    setActionStatus('Match reset! Camera view restored. Ready for new match.');
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
          
          {/* Referee Score Submission Status - show when match is finished or under review */}
          {(matchPhase === 'FINISHED' || matchPhase === 'UNDER_REVIEW') && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h4 className="text-center font-bold text-lg mb-3">📋 Referee Submissions</h4>
              <div className="flex justify-center gap-8">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  eventData?.red_scores_submitted 
                    ? 'bg-green-100 border-2 border-green-500 text-green-800' 
                    : 'bg-red-100 border-2 border-red-300 text-red-700'
                }`}>
                  <span className="text-lg">{eventData?.red_scores_submitted ? '✅' : '⏳'}</span>
                  <span className="font-bold">RED:</span>
                  <span>{eventData?.red_scores_submitted ? 'Submitted' : 'Pending'}</span>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  eventData?.blue_scores_submitted 
                    ? 'bg-green-100 border-2 border-green-500 text-green-800' 
                    : 'bg-blue-100 border-2 border-blue-300 text-blue-700'
                }`}>
                  <span className="text-lg">{eventData?.blue_scores_submitted ? '✅' : '⏳'}</span>
                  <span className="font-bold">BLUE:</span>
                  <span>{eventData?.blue_scores_submitted ? 'Submitted' : 'Pending'}</span>
                </div>
              </div>
              {eventData?.red_scores_submitted && eventData?.blue_scores_submitted && (
                <div className="mt-3 text-center text-green-600 font-bold animate-pulse">
                  ✅ Both referees have submitted! Ready to release final scores.
                </div>
              )}
            </div>
          )}
          
          {/* Release Final Scores button - only show when match is finished or under review */}
          {(matchPhase === 'FINISHED' || matchPhase === 'UNDER_REVIEW') && (
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={handleReleaseFinalScores}
                className="px-8 py-4 bg-purple-700 text-white rounded-lg font-bold text-xl hover:bg-purple-800 transition-colors animate-pulse"
              >
                🏆 Release Final Scores
              </button>
            </div>
          )}
          
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
        
        {/* Host Score Editing Controls */}
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold">✏️ Score Editing (Host Override)</h3>
            <button
              onClick={() => setShowScoreEdit(!showScoreEdit)}
              className={`px-4 py-2 rounded font-bold transition-colors ${
                showScoreEdit 
                  ? 'bg-gray-600 text-white hover:bg-gray-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {showScoreEdit ? 'Hide Scores' : 'Edit Scores'}
            </button>
          </div>
          
          {showScoreEdit && (
            <div className="flex gap-4 flex-col lg:flex-row">
              <ScoringControls
                alliance="RED"
                score={redScore}
                onScoreChange={(field, value) => handleScoreChange('RED', field, value)}
                disabled={false}
              />
              <ScoringControls
                alliance="BLUE"
                score={blueScore}
                onScoreChange={(field, value) => handleScoreChange('BLUE', field, value)}
                disabled={false}
              />
            </div>
          )}
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
              disabled={timerRunning}
              className={`px-6 py-3 rounded font-bold text-lg transition-colors ${
                timerRunning 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
              title={timerRunning ? 'Cannot randomize while match is in progress' : 'Randomize motif pattern'}
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
              {cameraEnabled && (
                <button
                  onClick={handleVideoStreamingToggle}
                  className={`px-4 py-2 rounded font-bold transition-colors ${
                    cameraStreaming 
                      ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {cameraStreaming ? '⏹️ Stop Streaming' : '📡 Stream to Display'}
                </button>
              )}
            </div>
            
            {/* Video streaming status */}
            {cameraStatus && (
              <div className={`p-2 rounded text-sm ${
                cameraStreaming 
                  ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {cameraStreaming && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>}
                {cameraStatus}
              </div>
            )}
            
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
                {cameraStreaming && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-sm font-bold animate-pulse">
                    🔴 LIVE
                  </div>
                )}
              </div>
            )}
            
            {/* Livestream URL for display camera mode */}
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternative: External Livestream URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={livestreamUrl}
                  onChange={(e) => setLivestreamUrl(e.target.value)}
                  placeholder="https://youtube.com/embed/... (optional)"
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
                Use this if you prefer to embed a YouTube/Twitch stream instead of the direct camera stream.
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mt-3">
              <strong>💡 Tip:</strong> Click &quot;Stream to Display&quot; to send your camera directly to the display page. No OBS required!
            </p>
          </div>
        </div>
        
        {/* Announcer Microphone / Audio Streaming */}
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-3">🎙️ Announcer Audio</h3>
          <p className="text-sm text-gray-600 mb-3">
            Enable announcer audio to stream your microphone to the display view. The audio will be transmitted to all connected displays in real-time.
          </p>
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <select
                value={selectedMicrophone}
                onChange={(e) => setSelectedMicrophone(e.target.value)}
                className="flex-1 p-2 border rounded"
                disabled={availableMicrophones.length === 0 || audioEnabled}
              >
                {availableMicrophones.length === 0 ? (
                  <option value="">No microphones found</option>
                ) : (
                  availableMicrophones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${availableMicrophones.indexOf(mic) + 1}`}
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={handleAudioToggle}
                disabled={availableMicrophones.length === 0}
                className={`px-4 py-2 rounded font-bold transition-colors ${
                  audioEnabled 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                } ${availableMicrophones.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {audioEnabled ? '🔇 Stop Audio' : '🎙️ Start Audio'}
              </button>
            </div>
            
            {/* Audio status indicator */}
            {audioStatus && (
              <div className={`p-2 rounded text-sm ${
                audioEnabled 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {audioEnabled && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>}
                {audioStatus}
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              <strong>Note:</strong> Audio streaming uses WebRTC for low-latency transmission. The display view will automatically receive audio when connected.
            </p>
          </div>
        </div>
        
        {/* Match Recording */}
        <div className="bg-white rounded-lg p-4 shadow">
          <h3 className="text-lg font-bold mb-3">🎬 Match Recording</h3>
          <p className="text-sm text-gray-600 mb-3">
            Record matches with video and audio. Choose between camera recording or screen capture (includes score bar and sound effects).
          </p>
          <div className="space-y-3">
            {/* Recording status */}
            {recordingStatus && (
              <div className={`p-3 rounded text-sm ${
                isRecording 
                  ? 'bg-red-100 text-red-800 border border-red-300' 
                  : recordedBlobUrl 
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-gray-700'
              }`}>
                {isRecording && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>}
                {recordingStatus}
              </div>
            )}
            
            {/* Recording controls */}
            <div className="flex gap-2 items-center flex-wrap">
              {!isRecording && !recordedBlobUrl && (
                <>
                  {(cameraStream || audioStream) && (
                    <button
                      onClick={startRecording}
                      className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700"
                    >
                      🔴 Record Camera
                    </button>
                  )}
                  <button
                    onClick={startScreenRecording}
                    className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700"
                  >
                    🖥️ Record Screen (with score bar & sounds)
                  </button>
                </>
              )}
              
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-gray-700 text-white rounded font-bold hover:bg-gray-800"
                >
                  ⏹️ Stop Recording
                </button>
              )}
              
              {recordedBlobUrl && (
                <>
                  <button
                    onClick={downloadRecording}
                    className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700"
                  >
                    ⬇️ Download Match {recordedMatchNumber} ({recordedFileExtension.toUpperCase()})
                  </button>
                  <button
                    onClick={clearRecording}
                    className="px-4 py-2 bg-gray-600 text-white rounded font-bold hover:bg-gray-700"
                  >
                    🗑️ Clear
                  </button>
                </>
              )}
            </div>
            
            {/* Preview recorded video */}
            {recordedBlobUrl && (
              <div className="mt-3">
                <video
                  src={recordedBlobUrl}
                  controls
                  className="w-full rounded border"
                  style={{ maxHeight: '200px' }}
                />
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              <strong>💡 Tip:</strong> Use &quot;Record Screen&quot; to capture the display page with the score bar and sound effects. 
              Open the display page in another browser tab/window, then select that tab when prompted.
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
          onClick={() => setShowHistory(true)}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-gray-700"
        >
          📊 History ({matchHistory.length})
        </button>
        <button
          onClick={resetMatch}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-orange-700"
        >
          🔄 Reset Match
        </button>
        <button
          onClick={resetScores}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-red-700"
        >
          🗑️ Reset Scores Only
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
