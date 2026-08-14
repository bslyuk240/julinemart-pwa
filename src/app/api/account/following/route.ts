import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getRouteUserFromRequest } from '@/lib/supabase/route-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getRouteUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data: follows, error } = await supabase
    .from('store_follows')
    .select('id, vendor_woo_id, vendor_uuid, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const vendorUuids = (follows || [])
    .map((f) => f.vendor_uuid)
    .filter(Boolean) as string[];

  let vendorMap = new Map<string, { store_name: string; store_logo: string | null; woocommerce_vendor_id: string | null }>();

  if (vendorUuids.length) {
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, store_name, logo_url, woocommerce_vendor_id')
      .in('id', vendorUuids);

    vendorMap = new Map(
      (vendors || []).map((v) => [
        v.id,
        {
          store_name: v.store_name,
          store_logo: v.logo_url,
          woocommerce_vendor_id: v.woocommerce_vendor_id,
        },
      ])
    );
  }

  const wooIdsMissing = (follows || [])
    .filter((f) => !f.vendor_uuid)
    .map((f) => f.vendor_woo_id);

  if (wooIdsMissing.length) {
    const { data: vendorsByWoo } = await supabase
      .from('vendors')
      .select('id, store_name, logo_url, woocommerce_vendor_id')
      .in('woocommerce_vendor_id', wooIdsMissing);

    for (const v of vendorsByWoo || []) {
      if (v.woocommerce_vendor_id) {
        vendorMap.set(v.woocommerce_vendor_id, {
          store_name: v.store_name,
          store_logo: v.logo_url,
          woocommerce_vendor_id: v.woocommerce_vendor_id,
        });
      }
    }
  }

  const stores = (follows || []).map((f) => {
    const vendor = f.vendor_uuid
      ? vendorMap.get(f.vendor_uuid)
      : vendorMap.get(f.vendor_woo_id);
    const vendorId = f.vendor_woo_id || vendor?.woocommerce_vendor_id || f.vendor_uuid;
    return {
      id: f.id,
      vendor_id: vendorId,
      store_name: vendor?.store_name || `Store ${vendorId}`,
      store_logo: vendor?.store_logo ?? null,
      followed_at: f.created_at,
    };
  });

  return NextResponse.json({ stores });
}
