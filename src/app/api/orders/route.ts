import { NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

function adaptOrder(o: any) {
  const nameParts = (o.customer_name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  return {
    id: o.order_number ?? o.id,       // numeric order_number used as URL key
    number: o.order_number ?? o.id,
    _supabase_id: o.id,               // keep UUID for detail fetch
    status: o.overall_status || 'processing',
    date_created: o.created_at,
    date_paid: o.paid_at ?? null,
    date_completed: null,
    total: String(o.total_amount ?? 0),
    subtotal: String(o.subtotal ?? 0),
    shipping_total: String(o.shipping_fee_paid ?? 0),
    discount_total: String(o.discount_amount ?? 0),
    currency: 'NGN',
    payment_method: o.payment_method || '',
    payment_method_title: o.payment_method || 'Paystack',
    transaction_id: o.payment_reference || '',
    billing: {
      first_name: firstName, last_name: lastName,
      email: o.customer_email, phone: o.customer_phone,
      address_1: o.delivery_address, city: o.delivery_city,
      state: o.delivery_state, country: 'NG',
    },
    shipping: {
      first_name: firstName, last_name: lastName,
      address_1: o.delivery_address, city: o.delivery_city,
      state: o.delivery_state, country: 'NG',
    },
    line_items: [],    // populated only in single order fetch
    meta_data: [],
  };
}

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  if (!JLO_BASE) return NextResponse.json({ orders: [] });

  const res = await fetch(`${JLO_BASE}/.netlify/functions/customer-orders?email=${encodeURIComponent(email)}`);
  const json = await res.json().catch(() => ({ success: false, data: [] }));

  if (!res.ok || !json.success) return NextResponse.json({ orders: [] });

  // Adapt Supabase shape → WC-compatible list shape
  const orders = (json.data || []).map(adaptOrder);
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Checkout page sends a WooCommerce-shaped body — extract what JLO needs
    const billing = body.billing || {};
    const shipping = body.shipping || billing;
    const lineItems: any[] = body.line_items || [];
    const metaData: any[] = body.meta_data || [];
    const shippingLines: any[] = body.shipping_lines || [];
    const customerNote: string = body.customer_note || '';

    const getMeta = (key: string) =>
      metaData.find((m: any) => m.key === key)?.value ?? null;

    const deliveryZone =
      getMeta('_jlo_destination_zone_name') ||
      getMeta('_jlo_destination_zone_id') ||
      shipping.state ||
      billing.state ||
      '';

    const shippingFee =
      shippingLines.length > 0 ? parseFloat(shippingLines[0].total || '0') : 0;

    const voucherCode = getMeta('_campaign_voucher_code') || undefined;

    // Map line items — prefer Supabase UUIDs stored in meta_data
    const items = lineItems
      .map((item: any) => {
        const itemMeta: any[] = item.meta_data || [];
        const getMi = (key: string) =>
          itemMeta.find((m: any) => m.key === key)?.value ?? null;
        const productId =
          getMi('_supabase_product_id') || String(item.product_id || '');
        const variationId =
          getMi('_supabase_variation_id') ||
          (item.variation_id ? String(item.variation_id) : undefined);
        return { product_id: productId, variation_id: variationId, quantity: item.quantity };
      })
      .filter((i: any) => i.product_id);

    const jloPayload = {
      customer_name: `${billing.first_name || ''} ${billing.last_name || ''}`.trim(),
      customer_email: billing.email || '',
      customer_phone: billing.phone || '',
      delivery_address: shipping.address_1 || billing.address_1 || '',
      delivery_city: shipping.city || billing.city || '',
      delivery_state: shipping.state || billing.state || '',
      delivery_zone: deliveryZone,
      delivery_lga: getMeta('_delivery_lga') || undefined,
      delivery_landmark: getMeta('_delivery_landmark') || undefined,
      items,
      shipping_fee: shippingFee,
      voucher_code: voucherCode,
      special_instructions: customerNote || undefined,
      order_notes: customerNote || undefined,
    };

    const jloRes = await fetch(`${JLO_BASE}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jloPayload),
    });

    const jloData = await jloRes.json();

    if (!jloRes.ok || !jloData.success) {
      console.error('JLO create-order failed:', jloRes.status, jloData);
      return NextResponse.json(
        { error: jloData.error || jloData.message || 'Failed to create order', detail: jloData.detail },
        { status: jloRes.status === 400 ? 400 : 500 }
      );
    }

    const d = jloData.data;
    // Return { id } so checkout page's `order.id` check still works
    return NextResponse.json(
      {
        id: d.order_id,
        order_number: d.order_number,
        payment_reference: d.payment_reference,
        total_amount: d.total_amount,
        subtotal: d.subtotal,
        discount_amount: d.discount_amount,
        shipping_fee: d.shipping_fee,
        item_count: d.item_count,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
