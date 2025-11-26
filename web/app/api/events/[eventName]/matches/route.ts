import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';
import { 
  extractRedScore, 
  extractBlueScore, 
  calculateTotalWithPenalties 
} from '@/lib/supabase';
import type { EventData, MatchRecord } from '@/lib/supabase';

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
