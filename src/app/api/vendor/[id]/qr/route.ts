import { NextRequest, NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  process.env.JLO_API_BASE_URL ||
  ''
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vendorId = decodeURIComponent(String(id ?? '')).trim();
  if (!vendorId || !JLO_BASE) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  try {
    const res = await fetch(
      `${JLO_BASE}/.netlify/functions/vendor-store-qr?vendor_id=${encodeURIComponent(vendorId)}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || 'QR failed' }, { status: res.status });
    }
    return NextResponse.json(data.data ?? data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'QR generation failed' },
      { status: 500 }
    );
  }
}
