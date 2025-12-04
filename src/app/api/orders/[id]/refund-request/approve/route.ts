import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';
import { addOrderNote } from '@/lib/woocommerce/refunds';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ success: false, message: 'Invalid order id' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { amount, reason, restock = true } = body as {
    amount?: number;
    reason?: string;
    restock?: boolean;
  };

  try {
    // Fetch order with existing refund request meta
    const orderRes = await wcApi.get(`orders/${orderId}`);
    const order = orderRes.data;

    const refundMeta = order?.meta_data?.find((m: any) => m.key === '_refund_request');
    const refundRequest = refundMeta?.value ? JSON.parse(refundMeta.value) : null;

    const refundAmount =
      typeof amount === 'number' && !Number.isNaN(amount)
        ? amount
        : refundRequest?.requested_amount
        ? Number(refundRequest.requested_amount)
        : Number(order?.total || 0);

    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid refund amount' },
        { status: 400 }
      );
    }

    // Create WooCommerce refund
    const refundRes = await wcApi.post(`orders/${orderId}/refunds`, {
      amount: refundAmount.toString(),
      reason: reason || refundRequest?.reason || 'Approved refund',
      api_refund: true,
      api_restock: !!restock,
    });

    // Update order meta to mark request as processed
    await wcApi.put(`orders/${orderId}`, {
      meta_data: [
        {
          key: '_refund_request',
          value: JSON.stringify({
            ...(refundRequest || {}),
            status: 'processed',
            processed_at: new Date().toISOString(),
            processed_refund_id: refundRes.data?.id,
          }),
        },
        { key: '_refund_request_status', value: 'processed' },
      ],
    });

    await addOrderNote(
      orderId,
      `REFUND APPROVED\nAmount: ${refundAmount}\nReason: ${reason || refundRequest?.reason || ''}`
    );

    return NextResponse.json({
      success: true,
      message: 'Refund approved and created in WooCommerce',
      refundId: refundRes.data?.id,
    });
  } catch (error) {
    handleApiError(error);
    return NextResponse.json(
      { success: false, message: 'Failed to approve refund' },
      { status: 500 }
    );
  }
}
