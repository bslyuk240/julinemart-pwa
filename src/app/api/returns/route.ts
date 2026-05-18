import { NextResponse } from 'next/server';
import { getJloBaseUrl } from '@/lib/jlo/returns';

const JLO_BASE = getJloBaseUrl();

export async function GET(request: Request) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('order_id');
  const customerEmail = searchParams.get('customer_email');
  const customerId = searchParams.get('wc_customer_id');

  // Map to the correct JLO Netlify function paths
  let path: string;
  if (orderId) {
    // Accepts both Supabase UUIDs and legacy WC numeric ids
    path = `/.netlify/functions/get-order-returns?order_id=${encodeURIComponent(orderId)}`;
  } else if (customerEmail) {
    path = `/api/returns-list?customer_email=${encodeURIComponent(customerEmail)}`;
  } else if (customerId) {
    path = `/api/returns-list?wc_customer_id=${encodeURIComponent(customerId)}`;
  } else {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const res = await fetch(`${JLO_BASE}${path}`);
    const data = await res.json().catch(async () => {
      const text = await res.text().catch(() => '');
      return { message: text || null };
    });

    if (!res.ok) {
      // Return empty array rather than propagating 400/500 — returns are optional
      return NextResponse.json([], { status: 200 });
    }

    // get-order-returns returns { success, data: [] }
    const payload = data?.data ?? data;
    return NextResponse.json(Array.isArray(payload) ? payload : [], { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
