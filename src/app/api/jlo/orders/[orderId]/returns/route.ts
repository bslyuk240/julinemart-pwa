import { NextResponse } from 'next/server';
import { getJloBaseUrl } from '@/lib/jlo/returns';

const JLO_BASE = getJloBaseUrl();

export async function GET(
  _request: Request,
  { params }: { params: { orderId: string } }
) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  const orderId = params.orderId;
  if (!orderId) {
    return NextResponse.json({ success: false, message: 'orderId is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${JLO_BASE}/api/orders/${orderId}/returns`);
    const data = await response.json().catch(async () => {
      const text = await response.text().catch(() => '');
      return { message: text || null };
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || data?.error || 'Failed to fetch returns for order',
          details: data,
          status: response.status,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Unexpected error fetching order returns' },
      { status: 500 }
    );
  }
}
