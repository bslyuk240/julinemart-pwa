import type { GiftBox, GiftFulfilmentCentre } from '@/types/gifts';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

function gfcParams(gfc?: string) {
  const params = new URLSearchParams();
  if (gfc) params.set('gfc', gfc);
  return params;
}

export async function fetchGiftBoxes(gfc = 'warri'): Promise<{
  boxes: GiftBox[];
  gfc: GiftFulfilmentCentre | null;
}> {
  if (!JLO_BASE) return { boxes: [], gfc: null };

  const params = gfcParams(gfc);
  const res = await fetch(`${JLO_BASE}/.netlify/functions/gift-boxes?${params}`, {
    next: { revalidate: 60 },
  });
  const json = await res.json();
  if (!res.ok || !json.success) return { boxes: [], gfc: null };
  return { boxes: json.data || [], gfc: json.gfc || null };
}

export async function fetchGiftBoxBySlug(
  slug: string,
  gfc = 'warri'
): Promise<{ box: GiftBox | null; gfc: GiftFulfilmentCentre | null }> {
  if (!JLO_BASE) return { box: null, gfc: null };

  const params = gfcParams(gfc);
  params.set('slug', slug);
  const res = await fetch(`${JLO_BASE}/.netlify/functions/gift-boxes?${params}`, {
    next: { revalidate: 60 },
  });
  const json = await res.json();
  if (!res.ok || !json.success) return { box: null, gfc: null };
  return { box: json.data || null, gfc: json.gfc || null };
}
