import { NextResponse } from 'next/server';
import { getRefundPolicy } from '@/lib/woocommerce/policies';

export async function GET() {
  try {
    const policy = await getRefundPolicy();
    return NextResponse.json(policy);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch refund policy' }, { status: 500 });
  }
}
