import { NextResponse } from 'next/server';

/**
 * Thin same-origin proxy to the JLO JulinePoints functions. JLO owns balances,
 * rules and money; this only forwards the customer's own Authorization header
 * (JLO verifies the JWT) and never accepts a user id, points amount or any
 * reward value from the browser.
 */
const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

const TARGETS: Record<string, { fn: string; method: 'GET' | 'POST' }> = {
  wallet: { fn: 'rewards-wallet', method: 'GET' },
  claim: { fn: 'rewards-claim', method: 'POST' },
  referral: { fn: 'rewards-referral', method: 'POST' },
};

async function forward(request: Request, action: string, method: 'GET' | 'POST') {
  const target = TARGETS[action];
  if (!target || target.method !== method || !JLO_BASE) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const authorization = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authorization) {
    return NextResponse.json({ success: false, error: 'Please sign in.' }, { status: 401 });
  }

  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    cache: 'no-store',
  };
  if (method === 'POST') {
    // Only the referral code is ever read from the browser.
    const body = await request.json().catch(() => ({}));
    init.body = JSON.stringify(action === 'referral' ? { code: body?.code } : {});
  }

  try {
    const res = await fetch(`${JLO_BASE}/api/${target.fn}`, init);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Rewards are unavailable right now.' }, { status: 502 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  return forward(request, action, 'GET');
}

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  return forward(request, action, 'POST');
}
