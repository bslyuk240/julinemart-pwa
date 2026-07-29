import type { Product } from '@/types/product';
import { slugify } from '@/lib/utils/helpers';
import { productMatchesCategory } from '@/lib/utils/category-filters';

function tagKeys(product: Product): Set<string> {
  const s = new Set<string>();
  for (const t of product.tags ?? []) {
    const k = slugify(t.slug || t.name || '');
    if (k) s.add(k);
  }
  return s;
}

/**
 * Higher = better match. Uses store, category aliases (via productMatchesCategory), and tags.
 * Products with no category still get matches from same vendor or popular recency (pool order).
 */
export function scoreProductRelatedness(current: Product, candidate: Product): number {
  if (candidate.id === current.id) return Number.NEGATIVE_INFINITY;

  let score = 0;

  const va = current.store?.id;
  const vb = candidate.store?.id;
  if (va != null && vb != null && String(va) === String(vb)) {
    score += 5;
  }

  for (const c of current.categories ?? []) {
    const ref = (c.slug || c.name || '').trim();
    if (ref && productMatchesCategory(candidate, ref)) {
      score += 3;
    }
  }

  const currentTags = tagKeys(current);
  if (currentTags.size > 0) {
    for (const t of candidate.tags ?? []) {
      const k = slugify(t.slug || t.name || '');
      if (k && currentTags.has(k)) score += 1;
    }
  }

  return score;
}

/**
 * Pick up to `limit` related products from `candidates` (same-store / category / tag first,
 * then whatever remains in pool order e.g. newest first).
 */
export function selectRelatedProducts(
  current: Product,
  candidates: Product[],
  limit: number
): Product[] {
  if (limit <= 0) return [];

  const rows = candidates
    .filter((p) => p && p.id !== current.id && p.id > 0)
    .map((p, index) => ({
      p,
      index,
      score: scoreProductRelatedness(current, p),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });

  const seen = new Set<number>();
  const out: Product[] = [];
  for (const row of rows) {
    if (out.length >= limit) break;
    if (seen.has(row.p.id)) continue;
    seen.add(row.p.id);
    out.push(row.p);
  }
  return out;
}

/** Dedupe by product id, preserve first occurrence. */
export function mergeUniqueById(a: Product[], b: Product[], limit: number): Product[] {
  const seen = new Set<number>();
  const out: Product[] = [];
  for (const list of [a, b]) {
    for (const p of list) {
      if (!p?.id) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
