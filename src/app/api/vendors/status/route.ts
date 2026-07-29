import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Vendor active/enabled status, keyed by legacy numeric WooCommerce vendor id
 * (JLO-onboarded vendors use `woocommerce_vendor_id = "jlo-{uuid}"` and are
 * treated as always-active by callers — see src/lib/utils/vendor-filters.ts).
 * Supabase is the source of truth; the old WooCommerce vendor plugin was retired.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toLegacyVendorId(value: unknown): number | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || !/^[0-9]+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('vendors')
      .select('woocommerce_vendor_id, store_name, is_active')
      .not('woocommerce_vendor_id', 'is', null)
      .limit(500);

    if (error) throw error;

    const vendors = (data ?? [])
      .map((row) => {
        const id = toLegacyVendorId(row.woocommerce_vendor_id);
        if (id == null) return null;
        const isActive = Boolean(row.is_active);
        return {
          id,
          store_name: row.store_name ?? '',
          enabled: isActive,
          is_store_vacation: false,
          is_active: isActive,
        };
      })
      .filter((v) => v != null);

    return NextResponse.json(vendors, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('❌ Vendor status error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
