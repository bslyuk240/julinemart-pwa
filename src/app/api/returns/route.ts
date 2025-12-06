import { NextResponse } from 'next/server';
import { getJloBaseUrl } from '@/lib/jlo/returns';

const JLO_BASE = getJloBaseUrl();

export async function GET(request: Request) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('wc_customer_id');
  const orderId = searchParams.get('order_id');

  const path = orderId
    ? `/api/returns-by-order/${encodeURIComponent(orderId)}`
    : customerId
    ? `/api/returns-list?wc_customer_id=${encodeURIComponent(customerId)}`
    : '/api/returns-list';

  try {
    const res = await fetch(`${JLO_BASE}${path}`);
    const data = await res.json().catch(async () => {
      const text = await res.text().catch(() => '');
      return { message: text || null };
    });

    if (!res.ok || data?.success === false) {
      return NextResponse.json(
        { success: false, message: data?.message || data?.error || 'Failed to fetch returns', details: data },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(data?.data ?? data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch returns' },
      { status: 500 }
    );
  }
}
