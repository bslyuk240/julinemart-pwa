import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';
import { getJloBaseUrl } from '@/lib/jlo/returns';

const JLO_BASE = getJloBaseUrl();

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

    let jloReturns: any[] = [];
    if (JLO_BASE) {
      try {
        const jloResponse = await fetch(`${JLO_BASE}/api/orders/${orderId}/returns`);
        const jloData = await jloResponse.json().catch(async () => {
          const text = await jloResponse.text().catch(() => '');
          return { message: text || null };
        });
        if (jloResponse.ok) {
          jloReturns = Array.isArray(jloData?.returns) ? jloData.returns : Array.isArray(jloData) ? jloData : [];
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
