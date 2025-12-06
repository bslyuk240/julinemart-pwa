import { NextRequest, NextResponse } from 'next/server';
import { getJloBaseUrl } from '@/lib/jlo/returns';

export async function GET(
  req: NextRequest,
  { params }: { params: { returnId: string } }
) {
  const base = getJloBaseUrl();
  const returnId = params.returnId;

  try {
    const res = await fetch(
       `${base}/api/return-shipments/${encodeURIComponent(returnId)}/tracking`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    return new NextResponse(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('PWA tracking proxy error:', err);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch tracking from JLO',
        error: err.message,
      },
      { status: 500 }
    );
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: { returnId: string } }
) {
  const base = getJloBaseUrl();
  const shipmentId = params.returnId;

  try {
    const body = await req.json();

    const res = await fetch(
      `${base}/api/return-shipments/${encodeURIComponent(shipmentId)}/tracking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    return new NextResponse(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('PWA tracking POST error:', err);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save tracking to JLO',
        error: err.message,
      },
      { status: 500 }
    );
  }
}