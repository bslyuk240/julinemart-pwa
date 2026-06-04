/**
 * POST /api/audit/signup
 * Called client-side after a successful Supabase signUp() so we can capture
 * the IP address and richer details. The DB trigger still handles Google/
 * OAuth signups (no session at that point), so this is an enrichment layer,
 * not a replacement.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, email, first_name, last_name, phone, provider = 'email' } = body;

    if (!user_id || !email) {
      return NextResponse.json({ error: 'user_id and email required' }, { status: 400 });
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    const supabase = getSupabaseServerClient();

    // Update the activity_logs row already created by the DB trigger, adding
    // IP/UA and richer details. If the trigger row doesn't exist yet (race),
    // we upsert via a fresh insert instead.
    const { error: updateErr } = await supabase
      .from('activity_logs')
      .update({
        ip_address: ip,
        user_agent: userAgent,
        details: {
          provider,
          first_name: first_name || null,
          last_name: last_name || null,
          phone: phone || null,
        },
      })
      .eq('user_id', user_id)
      .eq('action', 'SIGNUP')
      .is('ip_address', null); // only update if IP not yet set

    if (updateErr) {
      console.error('[audit/signup] update failed, inserting fallback:', updateErr.message);
      await supabase.from('activity_logs').insert({
        user_id,
        actor_email: email,
        action: 'SIGNUP',
        resource_type: 'customers',
        resource_id: user_id,
        ip_address: ip,
        user_agent: userAgent,
        details: { provider, first_name: first_name || null, last_name: last_name || null, phone: phone || null },
        source: 'storefront',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[audit/signup] error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
