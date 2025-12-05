import { NextResponse } from 'next/server';
import { getJloBaseUrl } from '@/lib/jlo/returns';

const JLO_BASE = getJloBaseUrl();

async function proxy(path: string, init: RequestInit) {
  const response = await fetch(`${JLO_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(async () => {
    const text = await response.text().catch(() => '');
    return { message: text || null };
  });

  if (!response.ok || data?.success === false) {
    return NextResponse.json(
      {
        success: false,
        message: data?.message || data?.error || 'JLO returns request failed',
        details: data,
        status: response.status,
      },
      { status: response.status || 500 }
    );
  }

  return NextResponse.json(data?.data ?? data, { status: response.status });
}

export async function GET(request: Request) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('wc_customer_id');
  const orderId = searchParams.get('order_id');

  const path = orderId
    ? `/api/orders/${orderId}/returns`
    : customerId
    ? `/api/returns?wc_customer_id=${encodeURIComponent(customerId)}`
    : '/api/returns';

  try {
    return await proxy(path, { method: 'GET' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to fetch returns from JLO' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    return await proxy('/api/returns', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to create return with JLO' },
      { status: 500 }
    );
  }
}
