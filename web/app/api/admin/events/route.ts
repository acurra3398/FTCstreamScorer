import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';

// Admin password from environment variable - required for admin access
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Interface for event details returned to admin
interface AdminEventDetails {
  event_name: string;
  password_hash: string;
  match_state: string;
  created_at: string;
  updated_at: string;
  red_team1: string;
  red_team2: string;
  blue_team1: string;
  blue_team2: string;
  timer_running: boolean;
  timer_paused: boolean;
  timer_seconds_remaining: number;
}

// POST /api/admin/events - Get all events with details (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check if admin password is configured
    if (!ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, message: 'Admin access is not configured. Set ADMIN_PASSWORD environment variable.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { adminPassword } = body;

    if (!adminPassword) {
      return NextResponse.json(
        { success: false, message: 'Admin password is required' },
        { status: 401 }
      );
    }

    // Verify admin password
    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, message: 'Invalid admin password' },
        { status: 401 }
      );
    }

    const client = getServerSupabaseClient();
    if (!client) {
      return NextResponse.json(
        { success: false, message: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get all events with details for admin view
    const { data: events, error } = await client
      .from('events')
      .select('event_name, password_hash, match_state, created_at, updated_at, red_team1, red_team2, blue_team1, blue_team2, timer_running, timer_paused, timer_seconds_remaining')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Return both the event names (for backward compatibility) and full event details
    const eventNames = events?.map(e => e.event_name) || [];
    const eventDetails = (events as AdminEventDetails[]) || [];

    return NextResponse.json({
      success: true,
      events: eventNames,
      eventDetails: eventDetails,
    });
  } catch (error) {
    console.error('Error in admin events API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
