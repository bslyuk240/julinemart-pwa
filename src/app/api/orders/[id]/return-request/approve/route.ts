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
  const { approveRefund = true, refundAmount, reason } = body as {
    approveRefund?: boolean;
    refundAmount?: number;
    reason?: string;
  };

  try {
    const orderRes = await wcApi.get(`orders/${orderId}`);
    const order = orderRes.data;
    const returnMeta = order?.meta_data?.find((m: any) => m.key === '_return_request');
    const returnRequest = returnMeta?.value ? JSON.parse(returnMeta.value) : null;
    const orderLineItems = Array.isArray(order?.line_items) ? order.line_items : [];

    const selectedLineItems = Array.isArray(returnRequest?.line_items)
      ? returnRequest.line_items
      : [];
    const lineItemsPayload = selectedLineItems
      .map((item: any) => {
        if (!item?.id || !item?.quantity) return null;
        const original = orderLineItems.find((li: any) => li.id === item.id);
        const maxQty = original?.quantity ?? item.quantity;
        const quantity = Math.min(item.quantity, maxQty);
        if (quantity <= 0) return null;
        const unitTotal = original?.quantity ? Number(original.total) / original.quantity : 0;
        const refund_total =
          typeof item.refund_total === 'number' && !Number.isNaN(item.refund_total)
            ? item.refund_total
            : parseFloat((unitTotal * quantity).toFixed(2));
        return {
          id: item.id,
          quantity,
          refund_total,
        };
      })
      .filter(Boolean);

    // Mark return as approved/processed
    await wcApi.put(`orders/${orderId}`, {
      meta_data: [
        {
          key: '_return_request',
          value: JSON.stringify({
            ...(returnRequest || {}),
            status: 'processed',
            processed_at: new Date().toISOString(),
            admin_notes: reason || returnRequest?.admin_notes,
          }),
        },
        { key: '_return_request_status', value: 'processed' },
      ],
    });

    let refundId: number | null = null;
    if (approveRefund) {
      const selectedAmount = lineItemsPayload.reduce(
        (sum: number, item: any) => sum + (item.refund_total || 0),
        0
      );
      const amountToRefund =
        typeof refundAmount === 'number' && !Number.isNaN(refundAmount)
          ? refundAmount
          : returnRequest?.requested_amount
          ? Number(returnRequest.requested_amount)
          : selectedAmount || Number(order?.total || 0);

      if (amountToRefund > 0) {
        const refundRes = await wcApi.post(`orders/${orderId}/refunds`, {
          amount: amountToRefund.toString(),
          reason: reason || returnRequest?.reason || 'Return approved',
          api_refund: true,
          api_restock: true,
          line_items: lineItemsPayload.length ? lineItemsPayload : undefined,
        });
        refundId = refundRes.data?.id ?? null;
      }
    }

    await addOrderNote(
      orderId,
      `RETURN APPROVED\n${reason || returnRequest?.reason || ''}${
        refundId ? `\nRefund ID: ${refundId}` : ''
      }${
        lineItemsPayload.length
          ? `\nItems:\n${lineItemsPayload
              .map((item: any) => `- #${item.id} x${item.quantity} (${item.refund_total})`)
              .join('\n')}`
          : ''
      }`
    );

    return NextResponse.json({
      success: true,
      message: 'Return processed',
      refundId,
    });
  } catch (error) {
    handleApiError(error);
    return NextResponse.json(
      { success: false, message: 'Failed to approve return' },
      { status: 500 }
    );
  }
}
