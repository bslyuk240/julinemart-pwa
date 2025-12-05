import { NextResponse } from 'next/server';
import { getJloBaseUrl } from '@/lib/jlo/returns';

const JLO_BASE = getJloBaseUrl();
const RETURN_FUNCTION_PATH = '/api/create-return-shipment';

export async function POST(request: Request) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${JLO_BASE}${RETURN_FUNCTION_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(async () => {
      const text = await response.text().catch(() => '');
      return { message: text || null };
    });
    if (!response.ok || data?.success === false) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || data?.error || 'Return shipment creation failed',
          details: data,
          status: response.status,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status || 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Unexpected error creating return shipment' },
      { status: 500 }
    );
  }
}
