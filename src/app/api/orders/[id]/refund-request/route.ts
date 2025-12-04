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

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const { reason, amount, customerEmail, customerName } = body;
  if (!reason || !amount) {
    return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
  }

  try {
    const refundRequest = {
      status: 'pending',
      reason,
      requested_amount: Number(amount),
      requested_at: new Date().toISOString(),
      customer_email: customerEmail || '',
      customer_name: customerName || '',
    };

    const response = await wcApi.put(`orders/${orderId}`, {
      meta_data: [
        { key: '_refund_request', value: JSON.stringify(refundRequest) },
        { key: '_refund_request_status', value: 'pending' },
      ],
    });

    if (!response.data) {
      return NextResponse.json({ success: false, message: 'Failed to update order' }, { status: 500 });
    }

    await addOrderNote(
      orderId,
      `REFUND REQUEST SUBMITTED\nAmount: ${amount}\nReason: ${reason}\nCustomer: ${customerName} (${customerEmail})`
    );

    return NextResponse.json({ success: true, message: 'Refund request submitted successfully' });
  } catch (error) {
    handleApiError(error);
    return NextResponse.json({ success: false, message: 'Failed to submit refund request' }, { status: 500 });
  }
}
