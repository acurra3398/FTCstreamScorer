import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import type { EventData, DecodeScore, MatchRecord } from '@/lib/supabase';

// Helper to extract scores from event data
function extractRedScore(event: EventData): DecodeScore {
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

function extractBlueScore(event: EventData): DecodeScore {
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

function calculateBasePoints(score: DecodeScore): number {
  let points = 0;
  const robot1Full = score.robot1Base === 'FULLY_IN_BASE';
  const robot2Full = score.robot2Base === 'FULLY_IN_BASE';
  const robot1Partial = score.robot1Base === 'PARTIALLY_IN_BASE';
  const robot2Partial = score.robot2Base === 'PARTIALLY_IN_BASE';
  
  if (robot1Partial) points += 5;
  if (robot2Partial) points += 5;
  if (robot1Full) points += 10;
  if (robot2Full) points += 10;
  if (robot1Full && robot2Full) points += 10;
  
  return points;
}

function calculateTotalScore(score: DecodeScore): number {
  let total = 0;
  if (score.robot1Leave) total += 3;
  if (score.robot2Leave) total += 3;
  total += score.autoClassified * 3;
  total += score.autoOverflow * 1;
  total += score.autoPatternMatches * 2;
  total += score.teleopClassified * 3;
  total += score.teleopOverflow * 1;
  total += score.teleopDepot * 1;
  total += score.teleopPatternMatches * 2;
  total += calculateBasePoints(score);
  return Math.max(0, total);
}

function calculateTotalWithPenalties(score: DecodeScore, opponentScore: DecodeScore): number {
  let total = calculateTotalScore(score);
  total += opponentScore.majorFouls * 15;
  total += opponentScore.minorFouls * 5;
  return Math.max(0, total);
}

// GET /api/events/[eventName]/matches - Get match history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  try {
    const { eventName } = await params;

    if (!eventName) {
      return NextResponse.json(
        { success: false, message: 'Event name is required' },
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

    const { data, error } = await client
      .from('match_records')
      .select('*')
      .eq('event_name', normalizedName)
      .order('match_number', { ascending: true });

    if (error) {
      console.error('Error fetching match history:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch match history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matches: data || [],
    });
  } catch (error) {
    console.error('Error in get matches API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventName]/matches - Record a match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  try {
    const { eventName } = await params;
    const body = await request.json();
    const { matchNumber } = body;

    if (!eventName) {
      return NextResponse.json(
        { success: false, message: 'Event name is required' },
        { status: 400 }
      );
    }

    if (typeof matchNumber !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Match number is required' },
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

    // Fetch current event data
    const { data: event, error: fetchError } = await client
      .from('events')
      .select('*')
      .eq('event_name', normalizedName)
      .single();

    if (fetchError || !event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    const redScore = extractRedScore(event as EventData);
    const blueScore = extractBlueScore(event as EventData);
    const redTotal = calculateTotalWithPenalties(redScore, blueScore);
    const blueTotal = calculateTotalWithPenalties(blueScore, redScore);

    let winner: 'RED' | 'BLUE' | 'TIE' = 'TIE';
    if (redTotal > blueTotal) winner = 'RED';
    else if (blueTotal > redTotal) winner = 'BLUE';

    const record: Omit<MatchRecord, 'id'> = {
      event_name: normalizedName,
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

    const { error: insertError } = await client
      .from('match_records')
      .insert(record);

    if (insertError) {
      console.error('Error recording match:', insertError);
      return NextResponse.json(
        { success: false, message: 'Failed to record match' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Match ${matchNumber} recorded successfully`,
      match: record,
    });
  } catch (error) {
    console.error('Error in record match API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to record match' },
      { status: 500 }
    );
  }
}
