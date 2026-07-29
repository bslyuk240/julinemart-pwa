import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { campaignAnalyticsEventSchema } from '@/lib/validations/campaigns';

// BE-204 — public telemetry ingestion. Rate-limited in middleware.ts
// (20 requests / 10s per IP, per the Security Checklist), validated here.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = campaignAnalyticsEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid event payload', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const event = parsed.data;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('campaign_analytics_events').insert({
    campaign_id: event.campaignId,
    qr_id: event.qrId ?? null,
    event_type: event.eventType,
    visitor_session_id: event.visitorSessionId,
    user_id: event.userId ?? null,
    order_id: event.orderId ?? null,
    revenue: event.revenue ?? 0,
    metadata: event.metadata ?? {},
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
