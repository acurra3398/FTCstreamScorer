import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, hashPasswordServer } from '@/lib/supabase-server';

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

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
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

    // Fetch the event
    const { data: event, error } = await client
      .from('events')
      .select('password_hash')
      .eq('event_name', normalizedName)
      .single();

    if (error) {
      // PGRST116 means "no rows found"
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

    if (!event || !event.password_hash) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    // Verify password
    const passwordHash = await hashPasswordServer(password);
    const isValid = event.password_hash === passwordHash;

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password verified successfully',
    });
  } catch (error) {
    console.error('Error in verify event API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify event: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
