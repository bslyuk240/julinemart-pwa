import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  }

  try {
    const response = await wcApi.get(`orders/${orderId}`);
    const order = response.data;

    let refundRequest: any = null;
    const refundMeta = order?.meta_data?.find((m: any) => m.key === '_refund_request');
    if (refundMeta?.value) {
      try {
        refundRequest = JSON.parse(refundMeta.value);
      } catch {
        refundRequest = null;
      }
    }

    return NextResponse.json({ order, refundRequest });
  } catch (error) {
    handleApiError(error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
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
