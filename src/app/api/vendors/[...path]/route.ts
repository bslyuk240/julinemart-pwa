import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Legacy vendor catch-all — backed by Supabase/JLO (WordPress proxy retired).
 *
 * GET /api/vendors/status
 * GET /api/vendors/status/:id
 * GET /api/vendors/product-count/:id
 * GET /api/vendors/:id
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const JLO_BASE = (
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  process.env.JLO_API_BASE_URL ||
  ''
).replace(/\/$/, '');

function toLegacyVendorId(value: unknown): number | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || !/^[0-9]+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function noStoreJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

async function allVendorStatuses() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('vendors')
    .select('woocommerce_vendor_id, store_name, is_active')
    .not('woocommerce_vendor_id', 'is', null)
    .limit(500);

  if (error) throw error;

  return (data ?? [])
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
}

async function vendorStatusById(vendorId: number) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('vendors')
    .select('woocommerce_vendor_id, store_name, is_active')
    .eq('woocommerce_vendor_id', String(vendorId))
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const isActive = Boolean(data.is_active);
  return {
    id: vendorId,
    store_name: data.store_name ?? '',
    enabled: isActive,
    is_store_vacation: false,
    is_active: isActive,
  };
}

async function vendorProductCount(vendorId: number) {
  if (!JLO_BASE) {
    return { vendor_id: vendorId, product_count: 0, product_ids: [] as number[] };
  }

  const res = await fetch(
    `${JLO_BASE}/.netlify/functions/catalog-products?woo_vendor_id=${encodeURIComponent(String(vendorId))}&per_page=1&status=published`,
    { cache: 'no-store', headers: { 'Content-Type': 'application/json' } }
  );

  if (!res.ok) {
    return { vendor_id: vendorId, product_count: 0, product_ids: [] as number[] };
  }

  const body = await res.json().catch(() => null);
  const total = Number(body?.meta?.total ?? 0);
  const productIds = Array.isArray(body?.data)
    ? body.data
        .map((row: { woo_product_id?: number; id?: number }) =>
          Number(row.woo_product_id ?? row.id ?? 0)
        )
        .filter((id: number) => id > 0)
    : [];

  return {
    vendor_id: vendorId,
    product_count: total || productIds.length,
    product_ids: productIds,
  };
}

async function vendorProfile(vendorId: number, request: NextRequest) {
  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/vendor/${vendorId}?per_page=1`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const vendor = body?.vendor;
  if (!vendor) return null;

  return {
    id: vendorId,
    store_name: vendor.store_name ?? '',
    store_slug: vendor.store_slug ?? '',
    store_url: vendor.store_url ?? `/vendor/${vendorId}`,
    logo: vendor.store_logo ?? '',
    gravatar: vendor.store_logo ?? '',
    banner: vendor.banner ?? '',
    avatar: vendor.store_logo ?? '',
    store_logo: vendor.store_logo ?? '',
    shop_description: vendor.shop_description ?? '',
    email: vendor.email ?? '',
    phone: vendor.phone ?? '',
    enabled: vendor.is_active !== false,
    is_active: vendor.is_active !== false,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path = [] } = await params;

    if (path[0] === 'status' && path[1]) {
      const vendorId = Number(path[1]);
      if (!Number.isFinite(vendorId)) {
        return noStoreJson({ error: 'Invalid vendor id' }, 400);
      }
      const status = await vendorStatusById(vendorId);
      if (!status) return noStoreJson({ error: 'Vendor not found' }, 404);
      return noStoreJson(status);
    }

    if (path[0] === 'status') {
      const vendors = await allVendorStatuses();
      return noStoreJson(vendors);
    }

    if (path[0] === 'product-count' && path[1]) {
      const vendorId = Number(path[1]);
      if (!Number.isFinite(vendorId)) {
        return noStoreJson({ error: 'Invalid vendor id' }, 400);
      }
      const count = await vendorProductCount(vendorId);
      return noStoreJson(count);
    }

    if (path[0] && /^[0-9]+$/.test(path[0])) {
      const vendorId = Number(path[0]);
      const profile = await vendorProfile(vendorId, request);
      if (!profile) return noStoreJson({ error: 'Vendor not found' }, 404);
      return noStoreJson(profile);
    }

    return noStoreJson({ error: 'Unknown vendor route' }, 404);
  } catch (error: unknown) {
    console.error('Vendor route error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return noStoreJson({ error: message }, 500);
  }
}
