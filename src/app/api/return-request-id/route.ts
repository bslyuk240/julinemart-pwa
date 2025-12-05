import { NextResponse } from 'next/server';

const JLO_BASE = process.env.JLO_API_BASE_URL || process.env.NEXT_PUBLIC_JLO_URL || '';

export async function GET(request: Request) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, message: 'JLO API base URL not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get('orderNumber');

  if (!orderNumber) {
    return NextResponse.json({ success: false, message: 'orderNumber is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${JLO_BASE}/api/return-requests/by-woocommerce/${orderNumber}`);
    const data = await response.json().catch(async () => {
      const text = await response.text().catch(() => '');
      return { message: text || null };
    });

    if (!response.ok || data?.success === false) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || 'Failed to fetch return request id',
          details: data,
          status: response.status,
        },
        { status: response.status || 500 }
      );
    }

    const payload = data?.data ?? data;
    return NextResponse.json({ success: true, return_request_id: payload?.return_request_id || payload?.id });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Unexpected error fetching return request id' },
      { status: 500 }
    );
  }
}
