import { NextRequest, NextResponse } from 'next/server';
import { getRouteUserFromRequest } from '@/lib/supabase/route-auth';

const JLO_BASE = (process.env.JLO_API_URL || process.env.NEXT_PUBLIC_JLO_API_URL || '').replace(
  /\/$/,
  ''
);

function authHeaders(request: NextRequest): HeadersInit | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return { Authorization: authHeader, 'Content-Type': 'application/json' };
}

export async function GET(req: NextRequest) {
  const user = await getRouteUserFromRequest(req);
  if (!user?.email) {
    return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
  }

  const orderId = req.nextUrl.searchParams.get('order_id');
  if (!orderId) {
    return NextResponse.json({ success: false, error: 'order_id required' }, { status: 400 });
  }

  const headers = authHeaders(req);
  if (!headers) {
    return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
  }

  const url = `${JLO_BASE}/.netlify/functions/customer-custom-order?order_id=${encodeURIComponent(orderId)}`;
  const res = await fetch(url, { cache: 'no-store', headers });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: NextRequest) {
  const user = await getRouteUserFromRequest(req);
  if (!user?.email) {
    return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
  }

  const headers = authHeaders(req);
  if (!headers) {
    return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
  }

  const body = await req.json();
  const res = await fetch(`${JLO_BASE}/.netlify/functions/customer-custom-order`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
