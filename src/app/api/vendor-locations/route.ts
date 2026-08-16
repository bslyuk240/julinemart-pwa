import { NextResponse } from 'next/server';
import { fetchJloFunction } from '@/lib/jlo/proxy';

export const dynamic = 'force-dynamic';

type LocationEntry = {
  id: string;
  lga: string;
  supports_local_delivery: boolean;
};

type VendorLocationsResponse = {
  grouped?: Record<string, Record<string, LocationEntry[]>>;
};

/** Powers the checkout LGA picker — same state→city→LGA data used at vendor registration. */
export async function GET() {
  const result = await fetchJloFunction<VendorLocationsResponse>('vendor-locations');

  if (!result.ok) {
    return NextResponse.json({ grouped: {} }, { status: 200 });
  }

  return NextResponse.json({ grouped: result.data?.grouped || {} });
}
