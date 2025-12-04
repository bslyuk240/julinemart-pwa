import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await wcApi.post('orders', body);
    return NextResponse.json(response.data);
  } catch (error) {
    handleApiError(error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
