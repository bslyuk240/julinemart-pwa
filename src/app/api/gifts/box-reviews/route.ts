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
    verified: row.verified_purchase,
    status: row.status,
  };
}

async function resolveBoxId(supabase: ReturnType<typeof getSupabaseServerClient>, giftBoxId?: string | null, slug?: string | null) {
  if (giftBoxId && UUID_RE.test(giftBoxId)) return giftBoxId;
  if (slug?.trim()) {
    const { data } = await supabase
      .from('gift_boxes')
      .select('id')
      .eq('slug', slug.trim().toLowerCase())
      .maybeSingle();
    return data?.id ?? null;
  }
  return null;
}

/** Public: approved reviews for a gift box (by Supabase id and/or slug). */
export async function GET(req: NextRequest) {
  try {
    const giftBoxId = req.nextUrl.searchParams.get('gift_box_id');
    const slug = req.nextUrl.searchParams.get('slug');

    const supabase = getSupabaseServerClient();
    const boxId = await resolveBoxId(supabase, giftBoxId, slug);
    if (!boxId) {
      return NextResponse.json({ error: 'Provide gift_box_id (uuid) or slug' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gift_box_reviews')
      .select('id, created_at, body, rating, reviewer_name, reviewer_email, verified_purchase, status')
      .eq('gift_box_id', boxId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('box-reviews GET:', error);
      return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
    }

    return NextResponse.json({ reviews: (data ?? []).map(mapRow) });
  } catch (e) {
    console.error('box-reviews GET:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** Public: submit a gift box review (pending moderation). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      gift_box_id?: string;
      slug?: string;
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
    if (reviewText.length > 5000 || reviewer.length > 200 || reviewerEmail.length > 320) {
      return NextResponse.json({ error: 'Invalid review payload' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const boxId = await resolveBoxId(supabase, body.gift_box_id, body.slug);
    if (!boxId) {
      return NextResponse.json({ error: 'Gift box not found' }, { status: 404 });
    }

    const { data: inserted, error } = await supabase
      .from('gift_box_reviews')
      .insert({
        gift_box_id: boxId,
        reviewer_name: reviewer,
        reviewer_email: reviewerEmail,
        rating: Math.round(rating),
        body: reviewText,
        status: 'pending',
      })
      .select('id, created_at, body, rating, reviewer_name, reviewer_email, verified_purchase, status')
      .single();

    if (error) {
      console.error('box-reviews POST:', error);
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
    }

    return NextResponse.json({ review: mapRow(inserted) });
  } catch (e) {
    console.error('box-reviews POST:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
