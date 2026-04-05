import { NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

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
