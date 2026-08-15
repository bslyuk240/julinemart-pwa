import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const ALLOWED_EVENT_TYPES = ['product_viewed', 'gift_landing_view', 'gift_byo_start', 'gift_purchase'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      event_type,
      customer_id,
      anonymous_id,
      customer_email,
      product_id,
      source_page,
      metadata,
    } = body as {
      event_type: string;
      customer_id?: string | null;
      anonymous_id?: string | null;
      customer_email?: string | null;
      product_id?: string | null;
      source_page?: string;
      metadata?: Record<string, unknown>;
    };

    if (!ALLOWED_EVENT_TYPES.includes(event_type)) {
      return NextResponse.json({ success: false, message: 'Invalid event_type' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from('customer_journey_events').insert({
      event_type,
      customer_id: customer_id ?? null,
      anonymous_id: anonymous_id ?? null,
      customer_email: customer_email ? String(customer_email).trim().toLowerCase() : null,
      product_id: product_id ?? null,
      source_page: source_page ?? null,
      metadata: metadata ?? {},
    });

    if (error) {
      console.error('customer_journey_events insert error:', error.message);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('track-event analytics error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
