import { NextResponse } from 'next/server';
import { catalogGetProducts } from '@/lib/catalog/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jloCatalogUrl =
    process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
    process.env.JLO_API_BASE_URL ||
    null;

  // 1. Check if the env var is configured
  const envConfigured = Boolean(jloCatalogUrl);

  // 2. Probe the JLO function directly and capture raw response
  let jloReachable = false;
  let jloStatus: number | null = null;
  let jloError: string | null = null;
  let rawResponse: unknown = null;
  let responseShape: string | null = null;

  if (jloCatalogUrl) {
    try {
      const url = `${jloCatalogUrl.replace(/\/$/, '')}/.netlify/functions/catalog-products?per_page=1`;
      const res = await fetch(url, { cache: 'no-store' });
      jloStatus = res.status;
      jloReachable = res.ok;

      const text = await res.text();
      try {
        rawResponse = JSON.parse(text);
        if (Array.isArray(rawResponse)) {
          responseShape = `array[${rawResponse.length}]`;
        } else if (rawResponse && typeof rawResponse === 'object') {
          responseShape = `object with keys: ${Object.keys(rawResponse as object).join(', ')}`;
        } else {
          responseShape = typeof rawResponse;
        }
      } catch {
        rawResponse = text.slice(0, 500); // show first 500 chars if not JSON
        responseShape = 'non-json';
      }

      if (!res.ok) jloError = text.slice(0, 300);
    } catch (err: any) {
      jloError = err?.message ?? 'fetch failed';
    }
  }

  // 3. Try the catalog client (goes through toWcProduct mapper)
  const catalogProducts = await catalogGetProducts({ per_page: 1 });
  const catalogWorking = catalogProducts !== null && catalogProducts.length > 0;

  return NextResponse.json({
    source: catalogWorking ? 'supabase_via_jlo' : 'woocommerce_fallback',
    jlo_catalog_url: jloCatalogUrl ?? '(not set)',
    env_configured: envConfigured,
    jlo_reachable: jloReachable,
    jlo_http_status: jloStatus,
    jlo_error: jloError,
    response_shape: responseShape,
    raw_response: rawResponse,
    catalog_client_working: catalogWorking,
    sample_product: catalogProducts?.[0]?.name ?? null,
  });
}
