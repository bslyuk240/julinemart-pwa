import { NextRequest, NextResponse } from 'next/server';
import { getJloBaseUrl } from '@/lib/jlo/returns';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ returnId: string }> }
) {
  const base = getJloBaseUrl();
  const { returnId } = await params;

  try {
    const res = await fetch(
       `${base}/api/return-shipments/${encodeURIComponent(returnId)}/tracking`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.get('authorization') ? { Authorization: req.headers.get('authorization') as string } : {}),
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
  { params }: { params: Promise<{ returnId: string }> }
) {
  const base = getJloBaseUrl();
  const { returnId: shipmentId } = await params;

  try {
    const body = await req.json();

    const res = await fetch(
      `${base}/api/return-shipments/${encodeURIComponent(shipmentId)}/tracking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // JLO requires the customer's login and checks the shipment is theirs.
          ...(req.headers.get('authorization') ? { Authorization: req.headers.get('authorization') as string } : {}),
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