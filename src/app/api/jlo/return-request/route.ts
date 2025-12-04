import { NextResponse } from 'next/server';

const JLO_BASE = process.env.JLO_API_BASE_URL || process.env.NEXT_PUBLIC_JLO_URL || '';

export async function POST(request: Request) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${JLO_BASE}/api/return-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(async () => {
      const text = await response.text().catch(() => '');
      return { message: text || null };
    });

    if (!response.ok || !data?.success || !data?.return_request_id) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || 'Failed to create JLO return request',
          details: data,
          status: response.status,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      return_request_id: data.return_request_id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Unexpected error creating JLO return request' },
      { status: 500 }
    );
  }
}
