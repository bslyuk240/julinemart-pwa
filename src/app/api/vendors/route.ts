import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const revalidate = 300;

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('vendors')
      .select('id, store_name, logo_url, banner_url, description, woocommerce_vendor_id')
      .eq('is_active', true)
      .not('store_name', 'is', null)
      .order('store_name', { ascending: true });

    if (error) throw error;

    const vendors = (data || []).map((v) => ({
      id: v.id,
      store_name: v.store_name,
      logo_url: v.logo_url || null,
      description: v.description || null,
      route_key: v.woocommerce_vendor_id || `jlo-${v.id}`,
    }));

    return NextResponse.json({ vendors });
  } catch {
    return NextResponse.json({ vendors: [] }, { status: 500 });
  }
}
