import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

// Live nationwide free-shipping offer from JLO shipping discounts.
// `threshold` is null when no offer is running, so callers never advertise one.
export async function GET() {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, threshold: null }, { status: 503 });
  }

  try {
    const res = await fetch(`${JLO_BASE}/.netlify/functions/free-shipping`, { cache: 'no-store' });
    const payload = await res.json().catch(() => null);
    const min = Number(payload?.data?.minOrderValue);
    const threshold = res.ok && payload?.success && Number.isFinite(min) ? min : null;

    return NextResponse.json(
      { success: true, threshold },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch {
    return NextResponse.json({ success: false, threshold: null }, { status: 502 });
  }
}
