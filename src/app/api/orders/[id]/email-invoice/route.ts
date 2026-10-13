import { NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!JLO_BASE) {
    return NextResponse.json({ success: false, error: 'Email service not configured' }, { status: 503 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { pdf_base64, file_name } = body;

  if (!pdf_base64) {
    return NextResponse.json({ success: false, error: 'pdf_base64 is required' }, { status: 400 });
  }

  // JLO only emails the signed-in customer, for their own order, so it needs
  // the customer's token.
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 });
  }

  const jloRes = await fetch(`${JLO_BASE}/.netlify/functions/send-invoice-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify({
      order_id: id,
      pdf_base64,
      file_name: file_name || `Invoice-${id}.pdf`,
    }),
  });

  const data = await jloRes.json().catch(() => ({ success: false }));
  return NextResponse.json(data, { status: jloRes.status });
}
