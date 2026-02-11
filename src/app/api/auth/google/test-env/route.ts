import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasClientId = !!process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_ANDROID_CLIENT_SECRET;
  
  return NextResponse.json({
    hasClientId,
    hasClientSecret,
    clientIdLength: process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.length || 0,
    timestamp: new Date().toISOString(),
  });
}
