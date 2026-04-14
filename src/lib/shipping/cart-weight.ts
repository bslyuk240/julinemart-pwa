/**
 * Cart line weights for JLO calc-shipping (per-kg rates).
 * Products without weight still get a conservative default so quotes stay usable.
 */

export const DEFAULT_SHIPPING_LINE_WEIGHT_KG = 0.5;

export function parseProductWeightKg(
  raw: string | number | null | undefined
): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/** Weight sent to calc-shipping for one cart line (never NaN). */
export function resolveLineWeightKg(weight: number | undefined | null): number {
  if (weight != null && Number.isFinite(weight) && weight >= 0) {
    return weight;
  }
  return DEFAULT_SHIPPING_LINE_WEIGHT_KG;
}
