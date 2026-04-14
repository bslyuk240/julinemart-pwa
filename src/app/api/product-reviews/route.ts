import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapRow(row: {
  id: string;
  created_at: string;
  body: string;
  rating: number;
  reviewer_name: string;
  reviewer_email: string;
  verified_purchase: boolean;
  status: string;
}) {
  return {
    id: row.id,
    date_created: row.created_at,
    review: row.body,
    rating: row.rating,
    reviewer: row.reviewer_name,
    reviewer_email: row.reviewer_email,
    verified: row.verified_purchase,
    status: row.status,
  };
}

/** Public: approved reviews for a product (by Supabase product id and/or Woo numeric id). */
export async function GET(req: NextRequest) {
  try {
    const supabaseId = req.nextUrl.searchParams.get('supabase_id');
    const wooParam = req.nextUrl.searchParams.get('woo_product_id') || req.nextUrl.searchParams.get('product_id');

    const supabase = getSupabaseServerClient();

    let q = supabase
      .from('product_reviews')
      .select(
        'id, created_at, body, rating, reviewer_name, reviewer_email, verified_purchase, status'
      )
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200);

    if (supabaseId && UUID_RE.test(supabaseId)) {
      q = q.eq('product_id', supabaseId);
    } else if (wooParam && /^\d+$/.test(wooParam) && parseInt(wooParam, 10) > 0) {
      q = q.eq('woo_product_id', parseInt(wooParam, 10));
    } else {
      return NextResponse.json(
        { error: 'Provide supabase_id (uuid) and/or woo_product_id / product_id' },
        { status: 400 }
      );
    }

    const { data, error } = await q;
    if (error) {
      console.error('product-reviews GET:', error);
      return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
    }

    return NextResponse.json({ reviews: (data ?? []).map(mapRow) });
  } catch (e) {
    console.error('product-reviews GET:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** Public: submit a review (pending moderation). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      product_id?: number;
      supabase_product_id?: string;
      review?: string;
      reviewer?: string;
      reviewer_email?: string;
      rating?: number;
    };

    const reviewText = String(body.review || '').trim();
    const reviewer = String(body.reviewer || '').trim();
    const reviewerEmail = String(body.reviewer_email || '').trim();
    const rating = Number(body.rating);

    if (!reviewText || !reviewer || !reviewerEmail || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid review payload' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    let prod: {
      id: string;
      vendor_id: string | null;
      reviews_allowed: boolean | null;
      woo_product_id: number | null;
    } | null = null;

    if (body.supabase_product_id && UUID_RE.test(body.supabase_product_id)) {
      const { data } = await supabase
        .from('products')
        .select('id, vendor_id, reviews_allowed, woo_product_id')
        .eq('id', body.supabase_product_id)
        .maybeSingle();
      prod = data;
    }

    const wooId = body.product_id != null && body.product_id > 0 ? body.product_id : null;
    if (!prod && wooId != null) {
      const { data } = await supabase
        .from('products')
        .select('id, vendor_id, reviews_allowed, woo_product_id')
        .eq('woo_product_id', wooId)
        .maybeSingle();
      prod = data;
    }

    if (!prod) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (prod.reviews_allowed === false) {
      return NextResponse.json({ error: 'Reviews are disabled for this product' }, { status: 403 });
    }

    const woo_product_id =
      prod.woo_product_id ?? (wooId != null && wooId > 0 ? wooId : null);

    const { data: inserted, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: prod.id,
        woo_product_id,
        vendor_id: prod.vendor_id,
        reviewer_name: reviewer,
        reviewer_email: reviewerEmail,
        rating: Math.round(rating),
        body: reviewText,
        status: 'pending',
      })
      .select(
        'id, created_at, body, rating, reviewer_name, reviewer_email, verified_purchase, status'
      )
      .single();

    if (error) {
      console.error('product-reviews POST:', error);
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
    }

    return NextResponse.json({ review: mapRow(inserted) });
  } catch (e) {
    console.error('product-reviews POST:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
