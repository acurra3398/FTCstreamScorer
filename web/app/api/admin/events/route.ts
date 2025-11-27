import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient } from '@/lib/supabase-server';

// Admin password from environment variable - required for admin access
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// POST /api/admin/events - Get all events (admin only)
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

    // Get all event names
    const { data: events, error } = await client
      .from('events')
      .select('event_name')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    const eventNames = events?.map(e => e.event_name) || [];

    return NextResponse.json({
      success: true,
      events: eventNames,
    });
  } catch (error) {
    console.error('Error in admin events API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
