import { NextResponse } from 'next/server';

const JLO_BASE_URL =
  process.env.NEXT_PUBLIC_JLO_URL?.replace(/\/$/, '') ||
  'https://admin.julinemart.com';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const res = await fetch(`${JLO_BASE_URL}/wp-json/jlo/v1/calc-shipping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, message: text || 'Failed to calculate shipping' },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to calculate shipping' },
      { status: 500 }
    );
  }
}
