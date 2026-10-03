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
      `${base}/api/returns/${encodeURIComponent(returnId)}/tracking`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // JLO requires the customer's login and checks the return is theirs.
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
