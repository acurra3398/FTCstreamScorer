import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, hashPasswordServer } from '@/lib/supabase-server';
import type { EventData } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventName, password } = body;

    // Validate input
    if (!eventName || typeof eventName !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Event name is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    const client = getServerSupabaseClient();
    if (!client) {
      return NextResponse.json(
        { success: false, message: 'Database not configured. Please set up Supabase backend first.' },
        { status: 500 }
      );
    }

    const normalizedName = eventName.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    // Check if event already exists
    const { data: existing } = await client
      .from('events')
      .select('event_name')
      .eq('event_name', normalizedName)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Event '${eventName}' already exists. Use 'Join Event' to connect.` },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await hashPasswordServer(password);

    // Create default event data
    const eventData: Partial<EventData> = {
      event_name: normalizedName,
      password_hash: passwordHash,
      motif: 'PPG',
      match_state: 'NOT_STARTED',
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
      return NextResponse.json(
        { success: false, message: 'Failed to create event: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Event '${normalizedName}' created successfully!\n\nShare this with your referees:\nEvent: ${normalizedName}\nPassword: (the one you entered)`,
    });
  } catch (error) {
    console.error('Error in create event API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create event: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
