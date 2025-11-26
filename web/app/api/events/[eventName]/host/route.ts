import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, hashPasswordServer } from '@/lib/supabase-server';
import { VALID_MATCH_STATES, VALID_MOTIFS } from '@/lib/constants';
import type { MatchState, MotifType } from '@/lib/supabase';

// PATCH /api/events/[eventName]/host - Host controls (requires password)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  try {
    const { eventName } = await params;
    const body = await request.json();
    const { password, action, data } = body;

    if (!eventName) {
      return NextResponse.json(
        { success: false, message: 'Event name is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required for host actions' },
        { status: 401 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required' },
        { status: 400 }
      );
    }

    const client = getServerSupabaseClient();
    if (!client) {
      return NextResponse.json(
        { success: false, message: 'Database not configured' },
        { status: 500 }
      );
    }

    const normalizedName = eventName.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    // Verify password first
    const { data: event, error: fetchError } = await client
      .from('events')
      .select('password_hash')
      .eq('event_name', normalizedName)
      .single();

    if (fetchError || !event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    const passwordHash = await hashPasswordServer(password);
    if (event.password_hash !== passwordHash) {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }

    // Handle different host actions
    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'setMatchState':
        if (!data?.matchState) {
          return NextResponse.json(
            { success: false, message: 'Match state is required' },
            { status: 400 }
          );
        }
        if (!VALID_MATCH_STATES.includes(data.matchState)) {
          return NextResponse.json(
            { success: false, message: 'Invalid match state' },
            { status: 400 }
          );
        }
        updateData.match_state = data.matchState;
        break;

      case 'setMotif':
        if (!data?.motif) {
          return NextResponse.json(
            { success: false, message: 'Motif is required' },
            { status: 400 }
          );
        }
        if (!VALID_MOTIFS.includes(data.motif)) {
          return NextResponse.json(
            { success: false, message: 'Invalid motif' },
            { status: 400 }
          );
        }
        updateData.motif = data.motif;
        break;

      case 'setTeams':
        if (data?.redTeam1 !== undefined) updateData.red_team1 = data.redTeam1;
        if (data?.redTeam2 !== undefined) updateData.red_team2 = data.redTeam2;
        if (data?.blueTeam1 !== undefined) updateData.blue_team1 = data.blueTeam1;
        if (data?.blueTeam2 !== undefined) updateData.blue_team2 = data.blueTeam2;
        break;

      case 'setLivestreamUrl':
        if (data?.livestreamUrl !== undefined) {
          updateData.livestream_url = data.livestreamUrl;
        }
        break;

      case 'updateTimerState':
        if (data?.timerRunning !== undefined) updateData.timer_running = data.timerRunning;
        if (data?.timerPaused !== undefined) updateData.timer_paused = data.timerPaused;
        if (data?.timerSecondsRemaining !== undefined) {
          updateData.timer_seconds_remaining = data.timerSecondsRemaining;
          // Always update the sync timestamp when seconds remaining changes
          updateData.timer_last_sync = new Date().toISOString();
        }
        if (data?.timerStartedAt !== undefined) updateData.timer_started_at = data.timerStartedAt;
        if (data?.timerPausedAt !== undefined) updateData.timer_paused_at = data.timerPausedAt;
        if (data?.countdownNumber !== undefined) updateData.countdown_number = data.countdownNumber;
        break;

      case 'setCountdown':
        // Set the pre-match countdown number (5, 4, 3, 2, 1, or null)
        updateData.countdown_number = data?.countdownNumber ?? null;
        break;
      
      case 'setAudioState':
        // Set audio streaming state for announcer microphone
        if (data?.audioEnabled !== undefined) updateData.audio_enabled = data.audioEnabled;
        if (data?.audioSdpOffer !== undefined) updateData.audio_sdp_offer = data.audioSdpOffer;
        if (data?.audioSdpAnswer !== undefined) updateData.audio_sdp_answer = data.audioSdpAnswer;
        if (data?.audioIceCandidates !== undefined) updateData.audio_ice_candidates = data.audioIceCandidates;
        break;

      case 'resetScores':
        // Reset all scores to zero and reset timer state
        updateData = {
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
          red_scores_submitted: false,
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
          blue_scores_submitted: false,
          match_state: 'NOT_STARTED',
          timer_running: false,
          timer_paused: false,
          timer_seconds_remaining: 30,
          timer_started_at: null,
          timer_paused_at: null,
          timer_last_sync: new Date().toISOString(),
          countdown_number: null,
          audio_enabled: false,
          audio_sdp_offer: '',
          audio_sdp_answer: '',
          audio_ice_candidates: '[]',
        };
        break;

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No data to update' },
        { status: 400 }
      );
    }

    const { error: updateError } = await client
      .from('events')
      .update(updateData)
      .eq('event_name', normalizedName);

    if (updateError) {
      console.error('Error updating event:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Action '${action}' completed successfully`,
    });
  } catch (error) {
    console.error('Error in host API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to perform host action' },
      { status: 500 }
    );
  }
}
