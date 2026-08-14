import { NextRequest, NextResponse } from 'next/server';
import { getRouteUserFromRequest } from '@/lib/supabase/route-auth';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getRouteUserFromRequest(request);
  if (!user?.email) {
    return NextResponse.json({ purchases: [], error: 'Sign in required' }, { status: 401 });
  }

  if (!JLO_BASE) {
    return NextResponse.json({ purchases: [] });
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ purchases: [], error: 'Sign in required' }, { status: 401 });
  }

  try {
    const url = `${JLO_BASE}/.netlify/functions/customer-purchases`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: authHeader },
    });
    const json = await res.json().catch(() => ({ success: false, data: [] }));
    if (!res.ok || !json.success) {
      return NextResponse.json({ purchases: [], error: json.error || 'Failed to load' }, { status: res.status });
    }
    return NextResponse.json({ purchases: json.data || [] });
  } catch {
    return NextResponse.json({ purchases: [] }, { status: 502 });
  }
}
