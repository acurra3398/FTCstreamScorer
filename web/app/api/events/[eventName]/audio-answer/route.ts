import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';

// POST /api/events/[eventName]/audio-answer - Display sends WebRTC answer back to host
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  try {
    const { eventName } = await params;
    const body = await request.json();
    const { answer, iceCandidates } = body;

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
    const updateData: Record<string, unknown> = {};

    // Update audio answer from display
    if (answer !== undefined) {
      updateData.audio_sdp_answer = answer;
    }
    
    // Update ICE candidates from display
    if (iceCandidates !== undefined) {
      updateData.audio_ice_candidates_display = iceCandidates;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No data to update' },
        { status: 400 }
      );
    }

    const { error } = await client
      .from('events')
      .update(updateData)
      .eq('event_name', normalizedName);

    if (error) {
      console.error('Error updating audio answer:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update audio answer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Audio answer updated successfully',
    });
  } catch (error) {
    console.error('Error in audio answer API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process audio answer' },
      { status: 500 }
    );
  }
}
