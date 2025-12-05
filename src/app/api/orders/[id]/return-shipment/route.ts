import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.return_request_id) {
      return NextResponse.json(
        { success: false, message: 'return_request_id is required to schedule a return shipment' },
        { status: 400 }
      );
    }

    const response = await fetch(`${new URL(request.url).origin}/api/return-shipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Unexpected error creating return shipment' },
      { status: 500 }
    );
  }
}
