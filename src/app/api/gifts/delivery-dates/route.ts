import { NextResponse } from 'next/server';
import { fetchJloFunction } from '@/lib/jlo/proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();

  const result = await fetchJloFunction<{
    success: boolean;
    data?: {
      earliest_date: string;
      latest_date: string;
      max_lead_time_days: number;
      same_day_supported: boolean;
      next_day_supported: boolean;
      cutoff_time: string | null;
    };
    error?: string;
  }>('gift-delivery-dates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  const payload = result.data;
  if (!payload?.success) {
    return NextResponse.json(
      { success: false, error: payload?.error || 'Delivery dates failed' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: payload.data });
}
