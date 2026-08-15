import { NextRequest, NextResponse } from 'next/server';
import { fetchJloFunction } from '@/lib/jlo/proxy';

export const dynamic = 'force-dynamic';

/** Public gift pool products at a consolidation hub (default: Warri). */
export async function GET(request: NextRequest) {
  const gfc = request.nextUrl.searchParams.get('gfc');
  const gfcId = request.nextUrl.searchParams.get('gfc_id');
  const params = new URLSearchParams();
  if (gfcId) params.set('gfc_id', gfcId);
  else if (gfc) params.set('gfc', gfc);

  const qs = params.toString();
  const result = await fetchJloFunction(`gift-pool-products${qs ? `?${qs}` : ''}`);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error, detail: result.detail },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data, { status: result.status });
}
