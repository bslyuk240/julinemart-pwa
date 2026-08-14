import { NextRequest, NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  process.env.JLO_API_BASE_URL ||
  ''
).replace(/\/$/, '');

export async function POST(request: NextRequest) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: true });
  }
  try {
    const body = await request.json();
    await fetch(`${JLO_BASE}/.netlify/functions/vendor-qr-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
