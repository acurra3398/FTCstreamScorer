import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// GET endpoint to fetch download count
export async function GET() {
  try {
    const count = await kv.get<number>('download_count') || 0;
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching download count:', error);
    // Return 0 if KV is not configured (local dev)
    return NextResponse.json({ count: 0 });
  }
}

// POST endpoint to increment download count
export async function POST(request: NextRequest) {
  try {
    const count = await kv.incr('download_count');
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error incrementing download count:', error);
    // Return current count if KV is not configured (local dev)
    return NextResponse.json({ count: 1 });
  }
}
