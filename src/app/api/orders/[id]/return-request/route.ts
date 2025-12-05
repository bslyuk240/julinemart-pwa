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

  const { line_items, preferred_resolution, reason_code } = body;
  if (!Array.isArray(line_items) || !line_items.length) {
    return NextResponse.json({ success: false, message: 'Select at least one item to return' }, { status: 400 });
  }
  if (!reason_code) {
    return NextResponse.json({ success: false, message: 'Missing reason code' }, { status: 400 });
  }

  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  try {
    const orderResponse = await wcApi.get(`orders/${orderId}`);
    const order = orderResponse.data;

    const orderLineItems = new Map<number, any>();
    (order?.line_items || []).forEach((item: any) => {
      orderLineItems.set(item.id, item);
    });

    const payloadLineItems = line_items.map((item: any) => {
      const orderItem = orderLineItems.get(item.id || item.wc_order_item_id);
      const qty = Math.min(
        Number(item.quantity || item.qty || 0),
        Number(orderItem?.quantity || item.quantity || item.qty || 0)
      );
      const unitPrice =
        orderItem?.price ??
        (orderItem?.total && orderItem?.quantity
          ? Number(orderItem.total) / Number(orderItem.quantity)
          : undefined);
      return {
        wc_order_item_id: orderItem?.id || item.id || item.wc_order_item_id,
        product_id: orderItem?.product_id || item.product_id || 0,
        variation_id: orderItem?.variation_id || item.variation_id || 0,
        qty: qty > 0 ? qty : 1,
        unit_price: unitPrice ?? Number(item.unit_price || 0),
        name: orderItem?.name || item.name,
      };
    });

    const payload = {
      order_id: order.id,
      order_number: order.number,
      wc_customer_id: order.customer_id || body.wc_customer_id || null,
      customer_email: order.billing?.email || body.customer_email || '',
      customer_name:
        body.customer_name ||
        `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
      preferred_resolution: preferred_resolution || 'refund',
      reason_code,
      reason_note: body.reason_note || '',
      images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
      line_items: payloadLineItems,
      notes: body.notes || '',
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

    if (!jloResponse.ok) {
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

    return NextResponse.json(jloData, { status: jloResponse.status });
  } catch (error) {
    handleApiError(error);
    return NextResponse.json({ success: false, message: 'Failed to submit return request' }, { status: 500 });
  }
}
