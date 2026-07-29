import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      event_name,
      platform,
      is_standalone,
      customer_id,
      anonymous_id,
      source_page,
      metadata,
    } = body as {
      event_name: string;
      platform?: string;
      is_standalone?: boolean;
      customer_id?: string | null;
      anonymous_id?: string;
      source_page?: string;
      metadata?: Record<string, unknown>;
    };

    if (!event_name) {
      return NextResponse.json({ success: false, message: 'Missing event_name' }, { status: 400 });
    }

    const user_agent = request.headers.get('user-agent') || '';

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from('pwa_install_events').insert({
      event_name,
      platform: platform ?? null,
      is_standalone: is_standalone ?? false,
      customer_id: customer_id ?? null,
      anonymous_id: anonymous_id ?? null,
      user_agent,
      source_page: source_page ?? null,
      metadata: metadata ?? {},
    });

    if (error) {
      console.error('pwa_install_events insert error:', error.message);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('pwa-install analytics error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
