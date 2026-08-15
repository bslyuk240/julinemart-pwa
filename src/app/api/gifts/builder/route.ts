import { NextRequest, NextResponse } from 'next/server';
import { fetchJloFunction } from '@/lib/jlo/proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionToken = request.nextUrl.searchParams.get('session_token');
  if (!sessionToken) {
    return NextResponse.json({ success: false, error: 'session_token required' }, { status: 400 });
  }

  const result = await fetchJloFunction(
    `gift-builder?session_token=${encodeURIComponent(sessionToken)}`
  );

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error, detail: result.detail },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: result.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await fetchJloFunction('gift-builder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error, detail: result.detail },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: result.status });
}
