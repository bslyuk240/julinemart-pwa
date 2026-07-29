/**
 * Resolve product + variation keys the same way for:
 * - JLO `voucherHelpers` (cart preview)
 * - JLO `create-order` (order lines from POST /api/orders)
 *
 * A mismatch (e.g. validate with numeric Woo id, order with Supabase uuid) can cause
 * "Invalid or expired voucher code" on create-order even when validate succeeds.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_RE.test(String(value).trim());
}

type CartLike = {
  supabaseProductId?: string;
  productId: number;
  variation?: { id: number; supabaseId?: string } | null;
};

/** Same rules as `jloItemIdsFromOrderLineItem` for live cart items. */
export function jloItemIdsFromCartLine(item: CartLike): {
  product_id: string;
  variation_id: string | undefined;
} {
  const productId = String(item.supabaseProductId ?? item.productId ?? '');
  const supaVar = item.variation?.supabaseId;
  const rawVar =
    supaVar != null && String(supaVar).trim() !== ''
      ? String(supaVar).trim()
      : item.variation != null && item.variation.id != null && item.variation.id !== 0
        ? String(item.variation.id)
        : undefined;
  let variationId: string | undefined = rawVar;
  if (!supaVar && isUuidString(productId) && rawVar && /^\d+$/.test(rawVar)) {
    variationId = undefined;
  }
  return { product_id: productId, variation_id: variationId };
}

type OrderLineLike = {
  product_id: number | string;
  variation_id?: number | string;
  meta_data?: { key: string; value: unknown }[];
};

/** Same as POST /api/orders → JLO `items` mapping (meta-first ids). */
export function jloItemIdsFromOrderLineItem(item: OrderLineLike): {
  product_id: string;
  variation_id: string | undefined;
} {
  const meta: { key: string; value: unknown }[] = item.meta_data || [];
  const g = (k: string) => meta.find((m) => m.key === k)?.value;
  const fromMetaP = g('_supabase_product_id');
  const productId =
    fromMetaP != null && String(fromMetaP).trim() !== ''
      ? String(fromMetaP).trim()
      : String(item.product_id || '');
  const supaVarIdRaw = g('_supabase_variation_id');
  const supaVarId =
    supaVarIdRaw != null && String(supaVarIdRaw).trim() !== ''
      ? String(supaVarIdRaw).trim()
      : undefined;
  const rawVariation =
    supaVarId ||
    (item.variation_id != null && item.variation_id !== 0
      ? String(item.variation_id)
      : undefined);
  let variationId: string | undefined = rawVariation;
  if (!supaVarId && isUuidString(productId) && rawVariation && /^\d+$/.test(String(rawVariation))) {
    variationId = undefined;
  }
  return { product_id: productId, variation_id: variationId };
}
