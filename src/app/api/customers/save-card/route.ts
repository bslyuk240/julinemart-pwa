// This endpoint is now legacy — card saving is done directly via Supabase client.
// Kept for backward compatibility; returns 410 Gone.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Deprecated — use Supabase client directly' },
    { status: 410 }
  );
}
