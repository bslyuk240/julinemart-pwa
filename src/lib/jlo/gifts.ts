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

export type GiftBoxFilters = {
  gfc?: string;
  occasion?: string;
  recipient?: string;
  budget?: string;
};

function budgetParams(budget?: string): { budget_min?: string; budget_max?: string } {
  if (!budget) return {};
  if (budget === 'under-10k') return { budget_max: '10000' };
  if (budget === 'under-20k') return { budget_max: '20000' };
  if (budget === 'under-50k') return { budget_max: '50000' };
  if (budget === 'premium') return { budget_min: '50000' };
  return {};
}

async function safeJson(res: Response): Promise<{ success?: boolean; data?: unknown; gfc?: unknown } | null> {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchGiftBoxes(
  gfc = 'warri',
  filters: Omit<GiftBoxFilters, 'gfc'> = {},
): Promise<{
  boxes: GiftBox[];
  gfc: GiftFulfilmentCentre | null;
}> {
  if (!JLO_BASE) return { boxes: [], gfc: null };

  const params = gfcParams(gfc);
  if (filters.occasion) params.set('occasion', filters.occasion);
  if (filters.recipient) params.set('recipient', filters.recipient);
  const bp = budgetParams(filters.budget);
  if (bp.budget_min) params.set('budget_min', bp.budget_min);
  if (bp.budget_max) params.set('budget_max', bp.budget_max);

  const res = await fetch(`${JLO_BASE}/.netlify/functions/gift-boxes?${params}`, {
    next: { revalidate: 60 },
  });
  const json = await safeJson(res);
  if (!res.ok || !json?.success) return { boxes: [], gfc: null };
  return { boxes: (json.data as GiftBox[]) || [], gfc: (json.gfc as GiftFulfilmentCentre) || null };
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
  const json = await safeJson(res);
  if (!res.ok || !json?.success) return { box: null, gfc: null };
  return { box: (json.data as GiftBox) || null, gfc: (json.gfc as GiftFulfilmentCentre) || null };
}
