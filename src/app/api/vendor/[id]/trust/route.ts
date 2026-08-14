import { NextRequest, NextResponse } from 'next/server';
import { getVendorTrust } from '@/lib/trust/get-vendor-trust';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vendorId = decodeURIComponent(String(id ?? '')).trim();

  if (!vendorId) {
    return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
  }

  const trust = await getVendorTrust(vendorId);
  if (!trust) {
    return NextResponse.json({ error: 'Trust profile not found' }, { status: 404 });
  }

  return NextResponse.json({ trust });
}
