import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';
import { generateReturnCode, ReturnMethod } from '@/lib/return-shipping';

interface FezShipmentResponse {
  tracking_number?: string;
  trackingNumber?: string;
}

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

    if (method === 'pickup') {
      try {
        const fezBase = process.env.FEZ_API_BASE_URL;
        const fezKey = process.env.FEZ_API_KEY;
        if (!fezBase || !fezKey) {
          throw new Error('Missing Fez API config');
        }

        const response = await fetch(`${fezBase}/shipment/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${fezKey}`,
          },
          body: JSON.stringify({
            customer: body.customer,
            hub: body.hub,
          }),
        });

        if (!response.ok) {
          throw new Error('Fez API request failed');
        }
        const data: FezShipmentResponse = await response.json();
        fezTracking = data.tracking_number || data.trackingNumber || null;
      } catch (fezError) {
        console.error('Fez pickup creation failed:', fezError);
        // Fall back to manual drop-off instructions while keeping the return code
      }
    }

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
