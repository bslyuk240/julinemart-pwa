import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';

// Sync Paystack reference into WooCommerce order meta so Woo admin refunds work.
// Configure live/test keys in env: WC_BASE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = body?.orderId;
    const reference = body?.reference;

    if (!orderId || !reference) {
      return NextResponse.json(
        { success: false, error: 'orderId and reference are required' },
        { status: 400 }
      );
    }

    const numericOrderId = Number(orderId);
    if (Number.isNaN(numericOrderId)) {
      return NextResponse.json(
        { success: false, error: 'orderId must be a number' },
        { status: 400 }
      );
    }

    console.log('[Woo Sync] Starting Paystack reference sync', {
      orderId: numericOrderId,
      reference,
    });

    const consumerKey = process.env.WC_CONSUMER_KEY || process.env.WC_KEY;
    const consumerSecret = process.env.WC_CONSUMER_SECRET || process.env.WC_SECRET;
    const baseUrl = process.env.WC_BASE_URL;

    if (!baseUrl || !consumerKey || !consumerSecret) {
      console.error('[Woo Sync] Missing WooCommerce credentials', {
        baseUrl: baseUrl ? 'SET' : 'MISSING',
        consumerKey: consumerKey ? 'SET' : 'MISSING',
        consumerSecret: consumerSecret ? 'SET' : 'MISSING',
      });
      return NextResponse.json(
        { success: false, error: 'WooCommerce credentials not configured' },
        { status: 500 }
      );
    }

    // Fetch order to get current meta_data (needed to overwrite existing meta entry).
    const orderResponse = await wcApi.get(`orders/${numericOrderId}`);
    const order = orderResponse.data;
    const metaData = Array.isArray(order?.meta_data) ? order.meta_data : [];
    const existingMeta = metaData.find(
      (m: any) => m?.key === '_paystack_transaction_reference'
    );

    const metaPayload = existingMeta
      ? [{ id: existingMeta.id, key: existingMeta.key, value: reference }]
      : [{ key: '_paystack_transaction_reference', value: reference }];

    const updateResponse = await wcApi.put(`orders/${numericOrderId}`, {
      meta_data: metaPayload,
    });

    const status =
      updateResponse?.status ||
      (updateResponse as any)?.response?.status ||
      (updateResponse as any)?.headers?.status ||
      'unknown';

    console.log('[Woo Sync] WooCommerce update status:', status);

    return NextResponse.json({
      success: true,
      orderId: numericOrderId,
      reference,
    });
  } catch (error: any) {
    handleApiError(error, '[Woo Sync] Failed to sync Paystack reference');

    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to sync reference';

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
