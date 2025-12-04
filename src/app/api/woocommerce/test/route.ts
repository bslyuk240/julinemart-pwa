import { NextResponse } from 'next/server';
import { testWooCommerceConnection } from '@/lib/woocommerce/test-connection';

export async function GET() {
  try {
    const result = await testWooCommerceConnection();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
