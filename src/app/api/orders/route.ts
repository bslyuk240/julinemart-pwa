import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';
import { OrderStatus } from '@/types/order';

function getInitialOrderStatus(paymentMethod?: unknown): OrderStatus {
  const normalizedMethod =
    typeof paymentMethod === 'string' ? paymentMethod.trim().toLowerCase() : '';

  if (normalizedMethod === 'cod') return 'processing';
  if (normalizedMethod === 'bacs' || normalizedMethod === 'cheque') return 'on-hold';
  return 'pending';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderPayload = {
      ...body,
      set_paid: body?.set_paid === true,
      status:
        body?.set_paid === true
          ? ((body?.status as OrderStatus | undefined) ?? 'processing')
          : getInitialOrderStatus(body?.payment_method),
    };

    if (orderPayload.set_paid !== true && 'date_paid' in orderPayload) {
      delete orderPayload.date_paid;
    }

    console.log('Creating order with meta_data:', body?.meta_data);
    console.log('Creating order with status:', orderPayload.status);
    const response = await wcApi.post('orders', orderPayload);
    return NextResponse.json(response.data);
  } catch (error) {
    handleApiError(error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
