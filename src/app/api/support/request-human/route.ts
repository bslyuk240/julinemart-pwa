import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// POST — customer requests to talk to a human agent
export async function POST(request: NextRequest) {
  try {
    const { session_id, customer_session_key } = await request.json();

    if (!session_id || !customer_session_key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify session belongs to this customer
    const { data: session, error: fetchError } = await supabase
      .from('support_sessions')
      .select('id, mode, status, customer_name, customer_email')
      .eq('id', session_id)
      .eq('customer_session_key', customer_session_key)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'closed') {
      return NextResponse.json({ error: 'Chat is closed' }, { status: 400 });
    }
    if (session.mode === 'human') {
      return NextResponse.json({ ok: true, already_human: true });
    }

    // Flip to human mode
    const { error: updateError } = await supabase
      .from('support_sessions')
      .update({ mode: 'human', status: 'open' })
      .eq('id', session_id);

    if (updateError) throw updateError;

    // Save a system message visible to both sides
    await supabase.from('support_messages').insert({
      session_id,
      sender_type: 'ai',
      sender_name: 'JulineMart Support',
      content:     'You have been connected to our support team. An agent will join shortly.',
    });

    // Get the first customer message for context in the staff notification
    const { data: firstMsg } = await supabase
      .from('support_messages')
      .select('content')
      .eq('session_id', session_id)
      .eq('sender_type', 'customer')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Fire-and-forget: notify all staff via JLO
    const jloUrl = process.env.JLO_BASE_URL;
    const secret = process.env.SUPPORT_NOTIFY_SECRET;
    if (jloUrl && secret) {
      fetch(`${jloUrl}/.netlify/functions/support-notify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-support-notify-secret': secret },
        body: JSON.stringify({
          action: 'human_requested',
          session: {
            customer_name:  session.customer_name  || 'Customer',
            customer_email: session.customer_email || '',
            first_message:  firstMsg?.content      || '',
          },
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to request human';
    console.error('[support/request-human POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
