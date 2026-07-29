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

  const { customer_email, pdf_base64, file_name } = body;

  if (!customer_email || !pdf_base64) {
    return NextResponse.json({ success: false, error: 'customer_email and pdf_base64 are required' }, { status: 400 });
  }

  const jloRes = await fetch(`${JLO_BASE}/.netlify/functions/send-invoice-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: id,
      customer_email,
      pdf_base64,
      file_name: file_name || `Invoice-${id}.pdf`,
    }),
  });

  const data = await jloRes.json().catch(() => ({ success: false }));
  return NextResponse.json(data, { status: jloRes.status });
}
