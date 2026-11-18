import { NextResponse } from 'next/server';

/**
 * Thin same-origin proxy to JLO's account-deletion function. JLO verifies the
 * customer's JWT and decides everything; this only forwards the Authorization
 * header and the three fields the screens need. The user id is never accepted
 * from the browser.
 */
const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

const ACTIONS = new Set(['status', 'request', 'confirm']);

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authorization) {
    return NextResponse.json({ success: false, error: 'Please sign in.' }, { status: 401 });
  }
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, error: 'Not available right now.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '');
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  // The confirmation link should open on the storefront the customer is using.
  const origin = new URL(request.url).origin;

  try {
    const res = await fetch(`${JLO_BASE}/api/account-deletion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authorization },
      body: JSON.stringify({ action, token: body?.token, origin }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not reach the server. Please try again.' }, { status: 502 });
  }
}
