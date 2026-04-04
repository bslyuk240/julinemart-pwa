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

  // 2. Probe the JLO function directly
  let jloReachable = false;
  let jloStatus: number | null = null;
  let jloError: string | null = null;
  let sampleProductName: string | null = null;

  if (jloCatalogUrl) {
    try {
      const url = `${jloCatalogUrl.replace(/\/$/, '')}/.netlify/functions/catalog-products?per_page=1`;
      const res = await fetch(url, { cache: 'no-store' });
      jloStatus = res.status;
      jloReachable = res.ok;

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          sampleProductName = data[0]?.name ?? null;
        }
      } else {
        jloError = await res.text().catch(() => `HTTP ${res.status}`);
      }
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
    catalog_client_working: catalogWorking,
    sample_product: sampleProductName ?? (catalogProducts?.[0]?.name ?? null),
  });
}
