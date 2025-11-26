import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/events/[eventName] - Fetch event data
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
      .from('events')
      .select('*')
      .eq('event_name', normalizedName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, message: 'Event not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching event:', error);
      return NextResponse.json(
        { success: false, message: 'Database error' },
        { status: 500 }
      );
    }

    // Remove password_hash from response for security
    const { password_hash, ...eventData } = data;

    return NextResponse.json({
      success: true,
      event: eventData,
    });
  } catch (error) {
    console.error('Error in get event API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PATCH /api/events/[eventName] - Update event scores
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventName: string }> }
) {
  try {
    const { eventName } = await params;
    const body = await request.json();
    const { alliance, score, scoresSubmitted } = body;

    if (!eventName) {
      return NextResponse.json(
        { success: false, message: 'Event name is required' },
        { status: 400 }
      );
    }

    if (!alliance || (alliance !== 'RED' && alliance !== 'BLUE')) {
      return NextResponse.json(
        { success: false, message: 'Valid alliance (RED or BLUE) is required' },
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
    const prefix = alliance.toLowerCase();
    const updateData: Record<string, unknown> = {};

    // Handle score submission flag
    if (scoresSubmitted !== undefined) {
      updateData[`${prefix}_scores_submitted`] = scoresSubmitted;
    }

    // Map score fields to database columns (if score object provided)
    if (score && typeof score === 'object') {
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
      console.error('Error updating scores:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update scores' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scores updated successfully',
    });
  } catch (error) {
    console.error('Error in update event API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update event' },
      { status: 500 }
    );
  }
}
