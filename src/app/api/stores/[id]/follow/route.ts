import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getRouteUserFromRequest } from '@/lib/supabase/route-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRouteUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ following: false }, { status: 200 });
  }

  const { id: vendorId } = await params;
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('store_follows')
    .select('id')
    .eq('user_id', user.id)
    .eq('vendor_woo_id', decodeURIComponent(vendorId))
    .maybeSingle();

  return NextResponse.json({ following: Boolean(data) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRouteUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in to follow stores' }, { status: 401 });
  }

  const { id: rawId } = await params;
  const vendorWooId = decodeURIComponent(rawId);
  const supabase = getSupabaseServerClient();

  let vendorUuid: string | null = null;
  const isUuid = /^[0-9a-f-]{36}$/i.test(vendorWooId);
  if (isUuid) {
    vendorUuid = vendorWooId;
  } else {
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('woocommerce_vendor_id', vendorWooId)
      .maybeSingle();
    vendorUuid = vendor?.id ?? null;
  }

  const { error } = await supabase.from('store_follows').upsert(
    {
      user_id: user.id,
      vendor_woo_id: vendorWooId,
      vendor_uuid: vendorUuid,
    },
    { onConflict: 'user_id,vendor_woo_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, following: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRouteUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: vendorId } = await params;
  const supabase = getSupabaseServerClient();
  await supabase
    .from('store_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('vendor_woo_id', decodeURIComponent(vendorId));

  return NextResponse.json({ success: true, following: false });
}
