import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// POST — create a new support session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_session_key, customer_name, customer_email, customer_user_id } = body;

    if (!customer_session_key) {
      return NextResponse.json({ error: 'Missing customer_session_key' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Upsert — safe to call again if session already exists
    const { data: session, error } = await supabase
      .from('support_sessions')
      .upsert(
        {
          customer_session_key,
          customer_name:    customer_name    || null,
          customer_email:   customer_email   || null,
          customer_user_id: customer_user_id || null,
          source_app:       'storefront',
        },
        { onConflict: 'customer_session_key', ignoreDuplicates: false }
      )
      .select('id, status, mode, assigned_staff_id, assigned_staff_name, unread_count')
      .single();

    if (error) throw error;

    // Fire-and-forget: customer receipt email via JLO notify function
    const jloUrl  = process.env.JLO_BASE_URL;
    const secret  = process.env.SUPPORT_NOTIFY_SECRET;
    if (jloUrl && secret && customer_email && body.first_message) {
      fetch(`${jloUrl}/.netlify/functions/support-notify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-support-notify-secret': secret },
        body: JSON.stringify({
          action: 'session_created',
          session: { customer_name, customer_email, first_message: body.first_message },
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ session });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create session';
    console.error('[support/session POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET — fetch session + messages by session key
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  try {
    const supabase = getSupabaseServerClient();

    const { data: session, error: sessionError } = await supabase
      .from('support_sessions')
      .select('id, status, mode, assigned_staff_id, assigned_staff_name, unread_count, created_at')
      .eq('customer_session_key', key)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ session: null, messages: [] });

    const { data: messages, error: msgError } = await supabase
      .from('support_messages')
      .select('id, sender_type, sender_name, content, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(200);

    if (msgError) throw msgError;

    return NextResponse.json({ session, messages: messages ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch session';
    console.error('[support/session GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
