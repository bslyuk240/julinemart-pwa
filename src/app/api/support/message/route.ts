import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { getRefundPolicy, getShippingPolicy, getTermsAndConditions } from '@/lib/supabase/static-pages';

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function buildSystemPrompt(): Promise<string> {
  const [shipping, refund, terms] = await Promise.allSettled([
    getShippingPolicy(),
    getRefundPolicy(),
    getTermsAndConditions(),
  ]);

  const shippingText = shipping.status === 'fulfilled' && shipping.value
    ? stripHtml(shipping.value.content)
    : 'Contact support for shipping details.';
  const refundText = refund.status === 'fulfilled' && refund.value
    ? stripHtml(refund.value.content)
    : 'Contact support for refund information.';
  const termsText = terms.status === 'fulfilled' && terms.value
    ? stripHtml(terms.value.content).slice(0, 2000)
    : '';

  return `You are a friendly and helpful customer support assistant for JulineMart, a Nigerian e-commerce marketplace.

Your role:
- Answer questions about orders, shipping, returns, payments, and store policies
- Be warm, concise, and professional
- Keep replies to 2-3 short sentences unless a step-by-step answer is truly needed
- Always refer customers to a human agent for: specific order issues requiring account lookup, payment disputes, complaints, or if they seem frustrated

Store Policies:
--- SHIPPING ---
${shippingText.slice(0, 1500)}

--- REFUNDS & RETURNS ---
${refundText.slice(0, 1500)}

--- TERMS ---
${termsText}

Important rules:
- Never invent order details, tracking numbers, or account information
- If unsure, say so and offer to connect them with a human agent
- Always end with an offer to help further or suggest "Talk to an agent" for complex issues
- Use plain text only — no markdown, no asterisks for bold, no backticks, no bullet dashes

Human agent escalation:
- When the customer agrees to be connected to a human agent, or when you determine they clearly need one (e.g. they are frustrated, have a payment dispute, need account-specific order lookup, or have explicitly asked to speak to a person), write your normal reply and then append [CONNECT_AGENT] on a new line at the very end, nothing after it.
- Do NOT include [CONNECT_AGENT] unless you are actually triggering the handoff in that specific message.`;
}

async function getAiReply(
  systemPrompt: string,
  messages: Array<{ sender_type: string; content: string }>
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  // Convert chat history to Anthropic message format (must alternate user/assistant)
  const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const msg of messages) {
    const role = msg.sender_type === 'customer' ? 'user' : 'assistant';
    // Merge consecutive same-role messages
    const last = anthropicMessages[anthropicMessages.length - 1];
    if (last && last.role === role) {
      last.content += '\n' + msg.content;
    } else {
      anthropicMessages.push({ role, content: msg.content });
    }
  }

  // Must start with user message
  if (!anthropicMessages.length || anthropicMessages[0].role !== 'user') {
    return "Hi! How can I help you today?";
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system:     systemPrompt,
      messages:   anthropicMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find(b => b.type === 'text')?.text ?? "I'm here to help — could you tell me more?";
}

// POST — customer sends a message; triggers AI reply if session is in 'ai' mode
export async function POST(request: NextRequest) {
  try {
    const { session_id, customer_session_key, content } = await request.json();

    if (!session_id || !customer_session_key || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify the session key matches this session (prevents spoofing)
    const { data: session, error: sessionError } = await supabase
      .from('support_sessions')
      .select('id, mode, status')
      .eq('id', session_id)
      .eq('customer_session_key', customer_session_key)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'closed') {
      return NextResponse.json({ error: 'This chat has been closed' }, { status: 400 });
    }

    // Save customer message
    const { data: customerMsg, error: insertError } = await supabase
      .from('support_messages')
      .insert({ session_id, sender_type: 'customer', content: content.trim() })
      .select('id, sender_type, sender_name, content, created_at')
      .single();

    if (insertError) throw insertError;

    // If in AI mode, generate and save AI reply
    let escalate = false;
    if (session.mode === 'ai') {
      let aiText = 'Thanks for your message. A support agent will assist you shortly.';
      try {
        const { data: history } = await supabase
          .from('support_messages')
          .select('sender_type, content')
          .eq('session_id', session_id)
          .order('created_at', { ascending: true })
          .limit(30);

        const systemPrompt = await buildSystemPrompt();
        const aiRaw = await getAiReply(systemPrompt, history ?? []);

        // Detect escalation sentinel
        const SENTINEL = '[CONNECT_AGENT]';
        if (aiRaw.includes(SENTINEL)) {
          escalate = true;
          aiText = aiRaw.replace(SENTINEL, '').trim();
        } else {
          aiText = aiRaw;
        }
      } catch (aiErr) {
        console.error('[support/message] AI reply failed:', aiErr instanceof Error ? aiErr.message : aiErr);
      }

      // Save AI reply (stripped of sentinel)
      await supabase
        .from('support_messages')
        .insert({ session_id, sender_type: 'ai', sender_name: 'JulineMart AI', content: aiText });

      // If AI decided to escalate, flip session to human and insert handoff message
      if (escalate) {
        await supabase
          .from('support_sessions')
          .update({ mode: 'human', status: 'open' })
          .eq('id', session_id);

        await supabase.from('support_messages').insert({
          session_id,
          sender_type: 'ai',
          sender_name: 'JulineMart Support',
          content: 'You have been connected to our support team. An agent will join shortly.',
        });
      }
    }

    return NextResponse.json({ message: customerMsg, escalate });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    console.error('[support/message POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
