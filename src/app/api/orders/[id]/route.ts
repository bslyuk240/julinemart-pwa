import { NextResponse } from 'next/server';
import { getJloBaseUrl } from '@/lib/jlo/returns';
import { getRouteUserFromRequest } from '@/lib/supabase/route-auth';

const JLO_BASE = getJloBaseUrl();

// Map sub-order status → numeric rank for comparison
const SUB_STATUS_RANK: Record<string, number> = {
  pending: 1,
  vendor_dispatched: 2,
  assigned: 2,
  pickup_scheduled: 2,
  pending_pickup: 2,
  picked_up: 3,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
};

function deriveOrderStatus(o: any): string {
  const dbStatus: string = o.overall_status || 'pending';

  if (dbStatus === 'pending') return 'pending';
  if (dbStatus === 'cancelled' || dbStatus === 'refunded') return dbStatus;

  const subOrders: any[] = o.sub_orders || [];
  if (!subOrders.length) return dbStatus;

  const ranks = subOrders
    .map((so: any) => SUB_STATUS_RANK[so.status] ?? 1)
    .filter((r: number) => r > 0);

  if (!ranks.length) return dbStatus;

  const minRank = Math.min(...ranks);
  const allDelivered = ranks.every((r: number) => r === 5);
  if (allDelivered) return 'delivered';

  const rankToWc: Record<number, string> = {
    1: 'processing',
    2: 'ready-to-ship',
    3: 'shipped',
    4: 'out-for-delivery',
    5: 'delivered',
  };
  return rankToWc[minRank] ?? dbStatus;
}

function getTrackingLink(courierName: string, trackingNumber: string): string | null {
  const name = courierName.toLowerCase();
  if (name.includes('fez')) return `https://fezdelivery.co/track/${trackingNumber}`;
  return null;
}

function buildMetaData(o: any): any[] {
  const subOrders: any[] = o.sub_orders || [];
  const trackingItems = subOrders
    .filter((so: any) => so.tracking_number || so.courier_waybill)
    .map((so: any) => {
      const tracking = so.tracking_number || so.courier_waybill;
      const courierName = so.couriers?.name || 'Fez Delivery';
      return {
        tracking_provider: courierName,
        tracking_number: tracking,
        tracking_link: getTrackingLink(courierName, tracking),
        date_shipped: so.updated_at ?? null,
      };
    });

  const meta: any[] = [];
  if (trackingItems.length) {
    meta.push({ key: 'wc_shipment_tracking_items', value: trackingItems });
  }

  const first = subOrders[0];
  if (first?.couriers?.name) {
    meta.push({ key: 'jlo_recommended_carrier', value: first.couriers.name });
  }
  if (first?.hubs?.name) {
    meta.push({ key: 'jlo_hub_name', value: first.hubs.name });
  }

  return meta;
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
    payment_status: o.payment_status || 'pending',
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
    line_items: (o.items || []).map((item: any, idx: number) => ({
      id: item.id ?? idx,
      name: item.product_name,
      product_id: item.product_id ?? 0,
      variation_id: item.variation_id ?? 0,
      sku: item.product_sku,
      quantity: item.quantity,
      price: item.unit_price,
      total: String(item.subtotal ?? 0),
      meta_data: [],
    })),
    meta_data: [
      ...buildMetaData(o),
      ...(o.fulfillment_method
        ? [{ key: '_fulfillment_method', value: o.fulfillment_method }]
        : []),
      ...(o.reservation_status
        ? [{ key: '_reservation_status', value: o.reservation_status }]
        : []),
      ...(o.reserved_until
        ? [{ key: '_reserved_until', value: o.reserved_until }]
        : []),
    ],
  };
}

async function fetchSupabaseOrder(id: string, ownerEmail: string): Promise<any | null> {
  if (!JLO_BASE) return null;

  // Primary: ask JLO for this owner's own order by id — works regardless of
  // whether `id` is a Supabase UUID or a legacy order number, since it's
  // scoped by the authenticated customer's email.
  const res = await fetch(
    `${JLO_BASE}/.netlify/functions/customer-orders?email=${encodeURIComponent(ownerEmail)}&order_id=${encodeURIComponent(id)}`
  );
  if (res.ok) {
    const json = await res.json().catch(() => null);
    if (json?.success && json.data) return json.data;
  }

  // Fallback: admin lookup by UUID. Only accept the result if it actually
  // belongs to the authenticated caller — this must never be trusted blind,
  // or any signed-in user could read any other customer's order by UUID.
  const isUUID = /^[0-9a-f-]{36}$/i.test(id);
  if (isUUID) {
    const adminRes = await fetch(`${JLO_BASE}/.netlify/functions/orders/${id}`);
    if (adminRes.ok) {
      const adminJson = await adminRes.json().catch(() => null);
      const orderRaw = adminJson?.success ? adminJson.data : null;
      if (orderRaw?.customer_email?.toLowerCase() === ownerEmail.toLowerCase()) {
        const itemsRes = await fetch(
          `${JLO_BASE}/.netlify/functions/customer-orders?email=${encodeURIComponent(orderRaw.customer_email)}&order_id=${encodeURIComponent(id)}`
        );
        if (itemsRes.ok) {
          const itemsJson = await itemsRes.json().catch(() => null);
          if (itemsJson?.success && itemsJson.data) return itemsJson.data;
        }
        return { ...orderRaw, items: [] };
      }
    }
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!JLO_BASE) {
    return NextResponse.json(
      { error: 'Order service not configured' },
      { status: 503 }
    );
  }

  const user = await getRouteUserFromRequest(request);
  if (!user?.email) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  try {
    const supabaseOrder = await fetchSupabaseOrder(id, user.email);
    if (!supabaseOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const supabaseId = supabaseOrder.id as string;
    const adapted = adaptOrder(supabaseOrder);

    let jloReturns: any[] = [];
    if (supabaseId) {
      try {
        const returnsRes = await fetch(
          `${JLO_BASE}/.netlify/functions/get-order-returns?order_id=${supabaseId}`
        );
        const returnsJson = await returnsRes.json().catch(() => null);
        if (returnsRes.ok && returnsJson?.success) {
          const payload = returnsJson.data ?? returnsJson;
          jloReturns = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.returns)
            ? payload.returns
            : [];
        }
      } catch (err) {
        console.warn('Failed to fetch returns from Supabase', err);
      }
    }

    return NextResponse.json({ order: adapted, returns: jloReturns });
  } catch (err) {
    console.error('Supabase order lookup failed:', err);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(
    {
      error: 'Order updates are managed in JLO — WooCommerce order API is retired.',
      order_id: id,
    },
    { status: 410 }
  );
}
