import { NextResponse } from 'next/server';

const JLO_BASE = process.env.JLO_API_BASE_URL || process.env.NEXT_PUBLIC_JLO_URL || '';

export async function POST(request: Request) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${JLO_BASE}/api/create-return-shipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(async () => {
      // fallback: try text if JSON parsing fails
      const text = await response.text().catch(() => '');
      return { message: text || null };
    });
    if (!response.ok || !data?.success) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || 'Return shipment creation failed',
          details: data,
          status: response.status,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Unexpected error creating return shipment' },
      { status: 500 }
    );
  }
}
