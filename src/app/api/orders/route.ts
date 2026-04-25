import { NextResponse } from 'next/server';
import { jloItemIdsFromOrderLineItem } from '@/lib/jlo/line-identity';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

const SUB_STATUS_RANK: Record<string, number> = {
  pending: 1,
  vendor_dispatched: 2,
  assigned: 2,
  pickup_scheduled: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
};

function deriveOrderStatus(o: any): string {
  const subOrders: any[] = o.sub_orders || [];
  const dbStatus: string = o.overall_status || 'processing';
  if (!subOrders.length) return dbStatus;

  const ranks = subOrders
    .map((so: any) => SUB_STATUS_RANK[so.status] ?? 1)
    .filter((r: number) => r > 0);
  if (!ranks.length) return dbStatus;

  const minRank = Math.min(...ranks);
  if (ranks.every((r: number) => r === 5)) return 'delivered';

  const rankToWc: Record<number, string> = {
    1: 'processing',
    2: 'ready-to-ship',
    3: 'shipped',
    4: 'out-for-delivery',
    5: 'delivered',
  };
  return rankToWc[minRank] ?? dbStatus;
}

function adaptOrder(o: any) {
  const nameParts = (o.customer_name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const derivedStatus = deriveOrderStatus(o);

  const subOrders: any[] = o.sub_orders || [];
  const allDelivered = subOrders.length > 0 && subOrders.every((so: any) => so.status === 'delivered');
  const lastDeliveredAt = allDelivered
    ? subOrders.map((so: any) => so.delivered_at).filter(Boolean).sort().at(-1) ?? null
    : null;

  return {
    id: o.order_number ?? o.id,
    number: o.order_number ?? o.id,
    _supabase_id: o.id,
    status: derivedStatus,
    date_created: o.created_at,
    date_paid: o.paid_at ?? null,
    date_completed: lastDeliveredAt,
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
    line_items: [],
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

    const influencerCouponCode = getMeta('_influencer_coupon_code') || undefined;

    const getShippingLineMeta = (key: string) => {
      const lineMeta: any[] = shippingLines[0]?.meta_data || [];
      return lineMeta.find((m: any) => m.key === key)?.value ?? null;
    };

    // Checkout sends discounted total in shipping_lines[0].total when an influencer
    // code applies; JLO create-order expects base shipping and re-applies the discount.
    let shippingFee =
      shippingLines.length > 0 ? parseFloat(shippingLines[0].total || '0') : 0;
    if (influencerCouponCode) {
      const originalRaw = getShippingLineMeta('_original_shipping_cost');
      if (originalRaw != null && String(originalRaw).trim() !== '') {
        const original = parseFloat(String(originalRaw));
        if (Number.isFinite(original) && original >= 0) {
          shippingFee = original;
        }
      }
    }

    const rawCampaignVoucher = getMeta('_campaign_voucher_code');
    const voucherCode =
      rawCampaignVoucher != null && String(rawCampaignVoucher).trim() !== ''
        ? String(rawCampaignVoucher).trim().toUpperCase()
        : undefined;

    // Map line items — same identity rules as voucherHelpers (src/lib/jlo/line-identity.ts)
    const items = lineItems
      .map((item: any) => {
        const { product_id, variation_id } = jloItemIdsFromOrderLineItem(item);
        return { product_id, variation_id, quantity: item.quantity };
      })
      .filter((i: any) => i.product_id);

    const jloPayload: Record<string, unknown> = {
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
      influencer_coupon_code: influencerCouponCode,
      special_instructions: customerNote || undefined,
      order_notes: customerNote || undefined,
    };
    if (voucherCode) {
      jloPayload.voucher_code = voucherCode;
      const campaignVoucherId = getMeta('_campaign_voucher_id');
      if (campaignVoucherId != null && String(campaignVoucherId).trim() !== '') {
        jloPayload.campaign_voucher_id = String(campaignVoucherId).trim();
      }
    }

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
