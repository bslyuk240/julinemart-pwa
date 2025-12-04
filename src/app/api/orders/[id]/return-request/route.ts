import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';

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

  const { reason, customerEmail, customerName } = body;
  if (!reason) {
    return NextResponse.json({ success: false, message: 'Missing reason' }, { status: 400 });
  }
  const line_items = Array.isArray(body.line_items) ? body.line_items : [];
  const requested_amount =
    typeof body.requested_amount === 'number' && !Number.isNaN(body.requested_amount)
      ? body.requested_amount
      : 0;

  if (!line_items.length) {
    return NextResponse.json(
      { success: false, message: 'Select at least one item to return' },
      { status: 400 }
    );
  }

  try {
    const returnRequest = {
      status: 'pending',
      reason,
      requested_at: new Date().toISOString(),
      requested_amount: requested_amount > 0 ? requested_amount : undefined,
      line_items,
      customer_email: customerEmail || '',
      customer_name: customerName || '',
    };

    const response = await wcApi.put(`orders/${orderId}`, {
      meta_data: [
        { key: '_return_request', value: JSON.stringify(returnRequest) },
        { key: '_return_request_status', value: 'pending' },
      ],
    });

    if (!response.data) {
      return NextResponse.json({ success: false, message: 'Failed to update order' }, { status: 500 });
    }

    const itemsNote = line_items
      .map((item: any) => `- ${item.name || item.id} x${item.quantity} (${item.refund_total || 0})`)
      .join('\n');

    await wcApi.post(`orders/${orderId}/notes`, {
      note:
        `RETURN REQUEST SUBMITTED\nReason: ${reason}\nCustomer: ${customerName} (${customerEmail})` +
        (itemsNote ? `\nItems:\n${itemsNote}` : '') +
        (requested_amount ? `\nRequested: ${requested_amount}` : ''),
      customer_note: false,
    });

    return NextResponse.json({ success: true, message: 'Return request submitted successfully' });
  } catch (error) {
    handleApiError(error);
    return NextResponse.json({ success: false, message: 'Failed to submit return request' }, { status: 500 });
  }
}
