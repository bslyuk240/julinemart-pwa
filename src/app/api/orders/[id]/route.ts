import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';
import { getJloBaseUrl } from '@/lib/jlo/returns';

const JLO_BASE = getJloBaseUrl();

// Map sub-order status → numeric rank for comparison
const SUB_STATUS_RANK: Record<string, number> = {
  pending: 1,
  assigned: 2,
  pickup_scheduled: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
};

// Derive WC-compatible status from sub_orders progression
function deriveOrderStatus(o: any): string {
  const subOrders: any[] = o.sub_orders || [];
  const dbStatus: string = o.overall_status || 'processing';

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

// Build tracking meta_data from sub_orders so OrderStatusTracker can display it
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
        tracking_link: `https://fezdelivery.co/track/${tracking}`,
        date_shipped: so.updated_at ?? null,
      };
    });

  const meta: any[] = [];

  if (trackingItems.length) {
    meta.push({ key: 'wc_shipment_tracking_items', value: trackingItems });
  }

  // Show assigned carrier / hub even before tracking is added
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

  // date_completed: use delivered_at from the last sub-order if all delivered
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
    line_items: (o.items || []).map((item: any, idx: number) => ({
      id: item.id ?? idx,
      name: item.product_name,
      sku: item.product_sku,
      quantity: item.quantity,
      price: item.unit_price,
      total: String(item.subtotal ?? 0),
      meta_data: [],
    })),
    meta_data: buildMetaData(o),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ----------------------------------------------------------
  // 1. Try Supabase first via customer-orders Netlify function
  //    Pass ?email from the request if provided; otherwise use
  //    the admin orders endpoint for UUID lookups.
  // ----------------------------------------------------------
  if (JLO_BASE) {
    try {
      const url = new URL(request.url);
      const email = url.searchParams.get('email') || '';

      // Build the customer-orders URL — requires email for scoped lookup.
      // If no email, fall back to the admin orders endpoint (UUID only).
      let supabaseOrder: any = null;

      if (email) {
        // Scoped customer lookup
        const res = await fetch(
          `${JLO_BASE}/.netlify/functions/customer-orders?email=${encodeURIComponent(email)}&order_id=${encodeURIComponent(id)}`
        );
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.success && json.data) {
            supabaseOrder = json.data;
          }
        }
      }

      // If no email or scoped lookup missed, try admin orders by UUID
      if (!supabaseOrder) {
        const isUUID = /^[0-9a-f-]{36}$/i.test(id);
        if (isUUID) {
          const adminRes = await fetch(`${JLO_BASE}/.netlify/functions/orders/${id}`);
          if (adminRes.ok) {
            const adminJson = await adminRes.json().catch(() => null);
            if (adminJson?.success && adminJson.data) {
              // Admin orders function returns full order but no order_items join —
              // fetch items separately via customer-orders using the UUID
              const orderRaw = adminJson.data;
              // Try to get items via customer-orders with email from the order
              if (orderRaw.customer_email) {
                const itemsRes = await fetch(
                  `${JLO_BASE}/.netlify/functions/customer-orders?email=${encodeURIComponent(orderRaw.customer_email)}&order_id=${encodeURIComponent(id)}`
                );
                if (itemsRes.ok) {
                  const itemsJson = await itemsRes.json().catch(() => null);
                  if (itemsJson?.success && itemsJson.data) {
                    supabaseOrder = itemsJson.data;
                  }
                }
              }
              // If still no items data, use the admin order with empty items
              if (!supabaseOrder) {
                supabaseOrder = { ...orderRaw, items: [] };
              }
            }
          }
        }
      }

      if (supabaseOrder) {
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
      }
    } catch (err) {
      console.warn('Supabase order lookup failed, falling back to WC:', err);
    }
  }

  // ----------------------------------------------------------
  // 2. Fallback: WooCommerce (legacy orders)
  // ----------------------------------------------------------
  const orderId = Number(id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  }

  try {
    const response = await wcApi.get(`orders/${orderId}`);
    const order = response.data;

    let jloReturns: any[] = [];
    if (JLO_BASE) {
      try {
        const jloResponse = await fetch(`${JLO_BASE}/api/orders/${orderId}/returns`);
        const jloData = await jloResponse.json().catch(async () => {
          const text = await jloResponse.text().catch(() => '');
          return { message: text || null };
        });
        if (jloResponse.ok) {
          const payload = jloData?.data ?? jloData;
          jloReturns = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.returns)
            ? payload.returns
            : [];
        }
      } catch (error) {
        console.warn('Failed to fetch JLO returns', error);
      }
    }

    return NextResponse.json({ order, returns: jloReturns });
  } catch (error) {
    handleApiError(error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = Number(id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const response = await wcApi.put(`orders/${orderId}`, body);
    return NextResponse.json(response.data);
  } catch (error) {
    handleApiError(error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
