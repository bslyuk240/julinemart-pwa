import type { ProductVariation } from '@/types/product';

/**
 * First finite non-negative number wins. Used for catalog/WC price strings that can be
 * empty, or variable parents that only have min_price / variation rows.
 */
export function parseMoney(
  ...candidates: (string | number | undefined | null)[]
): number {
  for (const c of candidates) {
    if (c == null) continue;
    const n = typeof c === 'number' ? c : parseFloat(String(c).trim());
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

export function minVariationListPrice(items: ProductVariation[]): number {
  if (!items.length) return 0;
  const nums = items
    .map((v) => parseMoney(v.sale_price, v.price, v.regular_price))
    .filter((n) => n > 0);
  if (!nums.length) return 0;
  return Math.min(...nums);
}
