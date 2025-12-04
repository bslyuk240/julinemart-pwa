import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';
import { generateReturnCode, ReturnMethod } from '@/lib/return-shipping';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const orderId = Number(params.id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ success: false, message: 'Invalid order id' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, message: 'Invalid body' }, { status: 400 });
  }

  const method = body.method as ReturnMethod;
  if (!['pickup', 'dropoff'].includes(method)) {
    return NextResponse.json({ success: false, message: 'Invalid method' }, { status: 400 });
  }

  try {
    const returnCode = generateReturnCode();
    let fezTracking: string | null = null;

    const shipmentMeta = {
      method,
      return_code: returnCode,
      status: 'pending',
      fez_tracking: fezTracking,
      created_at: new Date().toISOString(),
    };

    await wcApi.put(`orders/${orderId}`, {
      meta_data: [{ key: '_return_shipment', value: JSON.stringify(shipmentMeta) }],
    });

    await wcApi.post(`orders/${orderId}/notes`, {
      note: `RETURN SHIPPING SET\nMethod: ${method}\nReturn Code: ${returnCode}${
        fezTracking ? `\nTracking: ${fezTracking}` : ''
      }`,
      customer_note: false,
    });

    return NextResponse.json({
      success: true,
      shipment: shipmentMeta,
    });
  } catch (error) {
    handleApiError(error);
    return NextResponse.json(
      { success: false, message: 'Failed to set return shipping method' },
      { status: 500 }
    );
  }
}
