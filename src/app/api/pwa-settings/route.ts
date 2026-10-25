import { NextResponse } from 'next/server';
import { getPwaSettings } from '@/lib/home/pwa-settings';

export const revalidate = 300;

export async function GET() {
  const settings = await getPwaSettings();
  // Only return if we got at least sliders
  if (settings?.sliders) {
    return NextResponse.json(settings);
  }

  return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
}
