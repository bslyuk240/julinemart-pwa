import { NextResponse } from 'next/server';
import { getJloBaseUrl } from '@/lib/jlo/returns';

const JLO_BASE = getJloBaseUrl();

export async function POST(
  req: Request,
  { params }: { params: { returnId: string } }
) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  const { returnId } = params;
  if (!returnId) {
    return NextResponse.json({ success: false, message: 'Return ID is required' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(`${JLO_BASE}/api/return-shipments/${encodeURIComponent(returnId)}/tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(async () => {
      const text = await res.text().catch(() => '');
      return { message: text || null };
    });

    if (!res.ok || data?.success === false) {
      return NextResponse.json(
        { success: false, message: data?.message || data?.error || 'Failed to save tracking', details: data },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(data?.data ?? data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to save tracking' },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
