import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for DECODE scoring (2025-2026 FTC season)
export type MotifType = 'PPG' | 'PGP' | 'GPP';
export type BaseStatus = 'NOT_IN_BASE' | 'PARTIALLY_IN_BASE' | 'FULLY_IN_BASE';
export type MatchState = 'NOT_STARTED' | 'AUTONOMOUS' | 'TRANSITION' | 'TELEOP' | 'END_GAME' | 'FINISHED' | 'UNDER_REVIEW' | 'SCORES_RELEASED';

export interface DecodeScore {
  autoClassified: number;
  autoOverflow: number;
  autoPatternMatches: number;
  teleopClassified: number;
  teleopOverflow: number;
  teleopDepot: number;
  teleopPatternMatches: number;
  robot1Leave: boolean;
  robot2Leave: boolean;
  robot1Base: BaseStatus;
  robot2Base: BaseStatus;
  majorFouls: number;
  minorFouls: number;
}

export interface EventData {
  id?: number;
  event_name: string;
  password_hash?: string;
  host_device_id?: string;
  created_at?: string;
  updated_at?: string;
  
  // Match state
  motif: MotifType;
  match_state: MatchState;
  
  // Timer state (managed by host)
  timer_running: boolean;
  timer_paused: boolean;
  timer_seconds_remaining: number;
  timer_started_at?: string;
  timer_paused_at?: string;
  // Timestamp when timer_seconds_remaining was last updated (for sync precision)
  timer_last_sync?: string;
  
  // Pre-match countdown (5, 4, 3, 2, 1 - null when not in countdown)
  countdown_number?: number | null;
  
  // Camera livestream URL
  livestream_url: string;
  
  // Team info
  red_team1: string;
  red_team2: string;
  blue_team1: string;
  blue_team2: string;
  
  // Red Alliance scores
  red_auto_classified: number;
  red_auto_overflow: number;
  red_auto_pattern: number;
  red_teleop_classified: number;
  red_teleop_overflow: number;
  red_teleop_depot: number;
  red_teleop_pattern: number;
  red_robot1_leave: boolean;
  red_robot2_leave: boolean;
  red_robot1_base: BaseStatus;
  red_robot2_base: BaseStatus;
  red_major_fouls: number;
  red_minor_fouls: number;
  
  // Blue Alliance scores
  blue_auto_classified: number;
  blue_auto_overflow: number;
  blue_auto_pattern: number;
  blue_teleop_classified: number;
  blue_teleop_overflow: number;
  blue_teleop_depot: number;
  blue_teleop_pattern: number;
  blue_robot1_leave: boolean;
  blue_robot2_leave: boolean;
  blue_robot1_base: BaseStatus;
  blue_robot2_base: BaseStatus;
  blue_major_fouls: number;
  blue_minor_fouls: number;
  
  // Referee score submission flags
  red_scores_submitted?: boolean;
  blue_scores_submitted?: boolean;
}

export interface MatchRecord {
  id?: number;
  event_name: string;
  match_number: number;
  recorded_at: string;
  motif: MotifType;
  
  // Team info
  red_team1: string;
  red_team2: string;
  blue_team1: string;
  blue_team2: string;
  
  // Final scores
  red_total_score: number;
  blue_total_score: number;
  
  // Detailed scoring data (JSON)
  red_score_data: string;
  blue_score_data: string;
  
  // Winner
  winner: 'RED' | 'BLUE' | 'TIE';
}

// Create default score
export function createDefaultScore(): DecodeScore {
  return {
    autoClassified: 0,
    autoOverflow: 0,
    autoPatternMatches: 0,
    teleopClassified: 0,
    teleopOverflow: 0,
    teleopDepot: 0,
    teleopPatternMatches: 0,
    robot1Leave: false,
    robot2Leave: false,
    robot1Base: 'NOT_IN_BASE',
    robot2Base: 'NOT_IN_BASE',
    majorFouls: 0,
    minorFouls: 0,
  };
}

// Calculate base return points
export function calculateBasePoints(score: DecodeScore): number {
  let points = 0;
  
  const robot1Full = score.robot1Base === 'FULLY_IN_BASE';
  const robot2Full = score.robot2Base === 'FULLY_IN_BASE';
  const robot1Partial = score.robot1Base === 'PARTIALLY_IN_BASE';
  const robot2Partial = score.robot2Base === 'PARTIALLY_IN_BASE';
  
  // Partial BASE return (5 points each)
  if (robot1Partial) points += 5;
  if (robot2Partial) points += 5;
  
  // Full BASE return (10 points each)
  if (robot1Full) points += 10;
  if (robot2Full) points += 10;
  
  // Bonus: Both robots fully in BASE (10 points)
  if (robot1Full && robot2Full) points += 10;
  
  return points;
}

// Calculate total score for an alliance
export function calculateTotalScore(score: DecodeScore): number {
  let total = 0;
  
  // AUTO - LEAVE (3 points each)
  if (score.robot1Leave) total += 3;
  if (score.robot2Leave) total += 3;
  
  // AUTO - ARTIFACTS
  total += score.autoClassified * 3;
  total += score.autoOverflow * 1;
  
  // AUTO - PATTERN
  total += score.autoPatternMatches * 2;
  
  // TELEOP - ARTIFACTS
  total += score.teleopClassified * 3;
  total += score.teleopOverflow * 1;
  total += score.teleopDepot * 1;
  
  // TELEOP - PATTERN
  total += score.teleopPatternMatches * 2;
  
  // BASE return
  total += calculateBasePoints(score);
  
  return Math.max(0, total);
}

// Calculate total including opponent penalties
export function calculateTotalWithPenalties(score: DecodeScore, opponentScore: DecodeScore): number {
  let total = calculateTotalScore(score);
  total += opponentScore.majorFouls * 15;
  total += opponentScore.minorFouls * 5;
  return Math.max(0, total);
}

// Calculate precise timer remaining based on sync timestamp
// This accounts for network delay by using the server's last sync time
export function calculatePreciseTimerSeconds(event: EventData): number {
  let seconds = event.timer_seconds_remaining ?? 30;
  
  // If timer is running and we have a sync timestamp, calculate the real remaining time
  if (event.timer_last_sync && event.timer_running && !event.timer_paused) {
    const syncTime = new Date(event.timer_last_sync).getTime();
    const now = Date.now();
    const elapsedSinceSync = Math.floor((now - syncTime) / 1000);
    seconds = Math.max(0, seconds - elapsedSinceSync);
  }
  
  return seconds;
}

// Format time as M:SS
export function formatTimeDisplay(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Extract score from event data
export function extractRedScore(event: EventData): DecodeScore {
  return {
    autoClassified: event.red_auto_classified || 0,
    autoOverflow: event.red_auto_overflow || 0,
    autoPatternMatches: event.red_auto_pattern || 0,
    teleopClassified: event.red_teleop_classified || 0,
    teleopOverflow: event.red_teleop_overflow || 0,
    teleopDepot: event.red_teleop_depot || 0,
    teleopPatternMatches: event.red_teleop_pattern || 0,
    robot1Leave: event.red_robot1_leave || false,
    robot2Leave: event.red_robot2_leave || false,
    robot1Base: event.red_robot1_base || 'NOT_IN_BASE',
    robot2Base: event.red_robot2_base || 'NOT_IN_BASE',
    majorFouls: event.red_major_fouls || 0,
    minorFouls: event.red_minor_fouls || 0,
  };
}

export function extractBlueScore(event: EventData): DecodeScore {
  return {
    autoClassified: event.blue_auto_classified || 0,
    autoOverflow: event.blue_auto_overflow || 0,
    autoPatternMatches: event.blue_auto_pattern || 0,
    teleopClassified: event.blue_teleop_classified || 0,
    teleopOverflow: event.blue_teleop_overflow || 0,
    teleopDepot: event.blue_teleop_depot || 0,
    teleopPatternMatches: event.blue_teleop_pattern || 0,
    robot1Leave: event.blue_robot1_leave || false,
    robot2Leave: event.blue_robot2_leave || false,
    robot1Base: event.blue_robot1_base || 'NOT_IN_BASE',
    robot2Base: event.blue_robot2_base || 'NOT_IN_BASE',
    majorFouls: event.blue_major_fouls || 0,
    minorFouls: event.blue_minor_fouls || 0,
  };
}

// Supabase client singleton
let supabase: SupabaseClient | null = null;

/**
 * Safely decode a base64url string (handles both base64 and base64url encoding).
 * Returns null if decoding fails.
 */
function safeBase64Decode(str: string): string | null {
  try {
    // Handle base64url encoding (replace URL-safe characters)
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

/**
 * Helper function to detect if a key looks like a service role key (secret key).
 * Supabase JWTs contain a "role" claim - service_role for secret keys, anon for public keys.
 * Service role keys typically have "role":"service_role" in the payload.
 */
function isServiceRoleKey(key: string): boolean {
  try {
    // Validate that it looks like a JWT (should start with 'eyJ' which is base64 for '{"')
    if (!key || !key.startsWith('eyJ')) {
      return false;
    }
    
    // Supabase keys are JWTs - the second part (payload) is base64 encoded
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    
    // Safely decode the payload (second part)
    const decoded = safeBase64Decode(parts[1]);
    if (!decoded) return false;
    
    const payload = JSON.parse(decoded);
    
    // Check if it's a service_role key
    return payload.role === 'service_role';
  } catch {
    // If we can't parse it, assume it's safe (let Supabase handle validation)
    return false;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }
  
  // SECURITY CHECK: Detect if a service role key is accidentally being used in the browser
  // This prevents the "Forbidden use of secret API key in browser" error
  if (typeof window !== 'undefined' && isServiceRoleKey(key)) {
    console.error(
      'SECURITY ERROR: A service role (secret) API key is being used in the browser. ' +
      'This is a security vulnerability. Please use the anon/public key for NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'The service role key should only be used in server-side code (API routes).'
    );
    throw new ForbiddenApiKeyError();
  }
  
  supabase = createClient(url, key);
  return supabase;
}

// Hash password using SHA-256 (browser-compatible)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Convert to base64url (matching Java implementation)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Create a new event (scrimmage)
export async function createEvent(
  eventName: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Database not configured. Please set up Supabase backend first.' };
  }
  
  const normalizedName = eventName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  
  // Check if event already exists
  const { data: existing } = await client
    .from('events')
    .select('event_name')
    .eq('event_name', normalizedName)
    .single();
  
  if (existing) {
    return { success: false, message: `Event '${eventName}' already exists. Use 'Join Event' to connect.` };
  }
  
  // Hash the password
  const passwordHash = await hashPassword(password);
  
  // Create default event data
  const eventData: Partial<EventData> = {
    event_name: normalizedName,
    password_hash: passwordHash,
    motif: 'PPG',
    match_state: 'NOT_STARTED',
    timer_running: false,
    timer_paused: false,
    timer_seconds_remaining: 30,
    livestream_url: '',
    red_team1: '',
    red_team2: '',
    blue_team1: '',
    blue_team2: '',
    red_auto_classified: 0,
    red_auto_overflow: 0,
    red_auto_pattern: 0,
    red_teleop_classified: 0,
    red_teleop_overflow: 0,
    red_teleop_depot: 0,
    red_teleop_pattern: 0,
    red_robot1_leave: false,
    red_robot2_leave: false,
    red_robot1_base: 'NOT_IN_BASE',
    red_robot2_base: 'NOT_IN_BASE',
    red_major_fouls: 0,
    red_minor_fouls: 0,
    blue_auto_classified: 0,
    blue_auto_overflow: 0,
    blue_auto_pattern: 0,
    blue_teleop_classified: 0,
    blue_teleop_overflow: 0,
    blue_teleop_depot: 0,
    blue_teleop_pattern: 0,
    blue_robot1_leave: false,
    blue_robot2_leave: false,
    blue_robot1_base: 'NOT_IN_BASE',
    blue_robot2_base: 'NOT_IN_BASE',
    blue_major_fouls: 0,
    blue_minor_fouls: 0,
  };
  
  const { error } = await client
    .from('events')
    .insert(eventData);
  
  if (error) {
    console.error('Error creating event:', error);
    return { success: false, message: 'Failed to create event: ' + error.message };
  }
  
  return { 
    success: true, 
    message: `Event '${normalizedName}' created successfully!\n\nShare this with your referees:\nEvent: ${normalizedName}\nPassword: (the one you entered)` 
  };
}

// Custom error class for Supabase not configured
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Database not configured. Please set up Supabase backend first.');
    this.name = 'SupabaseNotConfiguredError';
  }
}

// Custom error class for database connection errors
export class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

// Custom error class for forbidden API key usage in browser
export class ForbiddenApiKeyError extends Error {
  constructor() {
    super(
      'Configuration Error: A secret/service role API key is being used in the browser. ' +
      'This is a security risk. Please use the anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY) ' +
      'for browser operations. The service role key should only be used in server-side API routes.'
    );
    this.name = 'ForbiddenApiKeyError';
  }
}

// Fetch event by name
export async function fetchEvent(eventName: string): Promise<EventData | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new SupabaseNotConfiguredError();
  }
  
  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('event_name', eventName.toUpperCase())
    .single();
  
  if (error) {
    // PGRST116 means "no rows found" - this is expected when event doesn't exist
    if (error.code === 'PGRST116') {
      return null;
    }
    // Any other error is a connection/database issue
    console.error('Error fetching event:', error);
    throw new DatabaseConnectionError(error.message || 'Failed to connect to database');
  }
  
  return data as EventData;
}

// Update event scores
export async function updateEventScores(
  eventName: string, 
  alliance: 'RED' | 'BLUE', 
  score: Partial<DecodeScore>
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    throw new SupabaseNotConfiguredError();
  }
  
  const prefix = alliance.toLowerCase();
  const updateData: Record<string, unknown> = {};
  
  if (score.autoClassified !== undefined) updateData[`${prefix}_auto_classified`] = score.autoClassified;
  if (score.autoOverflow !== undefined) updateData[`${prefix}_auto_overflow`] = score.autoOverflow;
  if (score.autoPatternMatches !== undefined) updateData[`${prefix}_auto_pattern`] = score.autoPatternMatches;
  if (score.teleopClassified !== undefined) updateData[`${prefix}_teleop_classified`] = score.teleopClassified;
  if (score.teleopOverflow !== undefined) updateData[`${prefix}_teleop_overflow`] = score.teleopOverflow;
  if (score.teleopDepot !== undefined) updateData[`${prefix}_teleop_depot`] = score.teleopDepot;
  if (score.teleopPatternMatches !== undefined) updateData[`${prefix}_teleop_pattern`] = score.teleopPatternMatches;
  if (score.robot1Leave !== undefined) updateData[`${prefix}_robot1_leave`] = score.robot1Leave;
  if (score.robot2Leave !== undefined) updateData[`${prefix}_robot2_leave`] = score.robot2Leave;
  if (score.robot1Base !== undefined) updateData[`${prefix}_robot1_base`] = score.robot1Base;
  if (score.robot2Base !== undefined) updateData[`${prefix}_robot2_base`] = score.robot2Base;
  if (score.majorFouls !== undefined) updateData[`${prefix}_major_fouls`] = score.majorFouls;
  if (score.minorFouls !== undefined) updateData[`${prefix}_minor_fouls`] = score.minorFouls;
  
  const { error } = await client
    .from('events')
    .update(updateData)
    .eq('event_name', eventName.toUpperCase());
  
  if (error) {
    console.error('Error updating scores:', error);
    return false;
  }
  
  return true;
}

// Record a completed match
export async function recordMatch(
  eventName: string,
  matchNumber: number,
  event: EventData
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    throw new SupabaseNotConfiguredError();
  }
  
  const redScore = extractRedScore(event);
  const blueScore = extractBlueScore(event);
  const redTotal = calculateTotalWithPenalties(redScore, blueScore);
  const blueTotal = calculateTotalWithPenalties(blueScore, redScore);
  
  let winner: 'RED' | 'BLUE' | 'TIE' = 'TIE';
  if (redTotal > blueTotal) winner = 'RED';
  else if (blueTotal > redTotal) winner = 'BLUE';
  
  const record: Omit<MatchRecord, 'id'> = {
    event_name: eventName.toUpperCase(),
    match_number: matchNumber,
    recorded_at: new Date().toISOString(),
    motif: event.motif,
    red_team1: event.red_team1,
    red_team2: event.red_team2,
    blue_team1: event.blue_team1,
    blue_team2: event.blue_team2,
    red_total_score: redTotal,
    blue_total_score: blueTotal,
    red_score_data: JSON.stringify(redScore),
    blue_score_data: JSON.stringify(blueScore),
    winner,
  };
  
  const { error } = await client
    .from('match_records')
    .insert(record);
  
  if (error) {
    console.error('Error recording match:', error);
    return false;
  }
  
  return true;
}

// Get match history for an event
export async function getMatchHistory(eventName: string): Promise<MatchRecord[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new SupabaseNotConfiguredError();
  }
  
  const { data, error } = await client
    .from('match_records')
    .select('*')
    .eq('event_name', eventName.toUpperCase())
    .order('match_number', { ascending: true });
  
  if (error) {
    console.error('Error fetching match history:', error);
    return [];
  }
  
  return data as MatchRecord[];
}

// Verify event password
export async function verifyEventPassword(eventName: string, password: string): Promise<boolean> {
  const event = await fetchEvent(eventName);
  if (!event || !event.password_hash) return false;
  
  const passwordHash = await hashPassword(password);
  return event.password_hash === passwordHash;
}
