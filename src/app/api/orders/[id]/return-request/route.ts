import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';
import { getJloBaseUrl } from '@/lib/jlo/returns';

const JLO_BASE = getJloBaseUrl();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ success: false, message: 'Invalid order id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const { preferred_resolution, reason_code, method } = body;
  if (!reason_code) {
    return NextResponse.json({ success: false, message: 'Missing reason code' }, { status: 400 });
  }
  if (!method || !['pickup', 'dropoff'].includes(method)) {
    return NextResponse.json({ success: false, message: 'Return method is required (pickup | dropoff)' }, { status: 400 });
  }

  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  try {
    const orderResponse = await wcApi.get(`orders/${orderId}`);
    const order = orderResponse.data;

    const customerPayload = body.customer || {
      name: `${order.shipping?.first_name || order.billing?.first_name || ''} ${order.shipping?.last_name || order.billing?.last_name || ''}`.trim(),
      phone: order.billing?.phone,
      address: order.shipping?.address_1 || order.billing?.address_1,
      city: order.shipping?.city || order.billing?.city,
      state: order.shipping?.state || order.billing?.state,
    };

    const hubPayload = body.hub || {
      name: 'JulineMart Returns',
      phone: order.billing?.phone,
      address: order.billing?.address_1 || order.shipping?.address_1,
      city: order.billing?.city || order.shipping?.city,
      state: order.billing?.state || order.shipping?.state,
    };

    const payload = {
      order_id: order.id,
      wc_customer_id: order.customer_id || body.wc_customer_id || undefined,
      customer_email: order.billing?.email || body.customer_email || undefined,
      customer_name:
        body.customer_name ||
        `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() ||
        undefined,
      preferred_resolution: preferred_resolution || 'refund',
      reason_code,
      reason_note: body.reason_note || '',
      images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
      method,
      customer: method === 'pickup' ? customerPayload : undefined,
      hub: method === 'pickup' ? hubPayload : undefined,
    };

    const jloResponse = await fetch(`${JLO_BASE}/api/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const jloData = await jloResponse.json().catch(async () => {
      const text = await jloResponse.text().catch(() => '');
      return { message: text || null };
    });

    if (!jloResponse.ok || jloData?.success === false) {
      return NextResponse.json(
        {
          success: false,
          message: jloData?.message || jloData?.error || 'Failed to create return request',
          details: jloData,
          status: jloResponse.status,
        },
        { status: jloResponse.status || 500 }
      );
    }

    return NextResponse.json(jloData?.data ?? jloData, { status: jloResponse.status || 200 });
  } catch (error) {
    handleApiError(error);
    return NextResponse.json({ success: false, message: 'Failed to submit return request' }, { status: 500 });
  }
}
