import type { CartItem } from '@/types/cart';

export type SellerGroup = { seller: string; items: CartItem[] };

const FALLBACK_SELLER = 'JulineMart';

/** Group cart lines by seller, keeping the order sellers first appear in the cart. */
export function groupCartBySeller(items: CartItem[]): SellerGroup[] {
  const groups = new Map<string, CartItem[]>();
  items.forEach((item) => {
    const seller = item.vendorName?.trim() || FALLBACK_SELLER;
    const list = groups.get(seller);
    if (list) list.push(item);
    else groups.set(seller, [item]);
  });
  return [...groups.entries()].map(([seller, groupItems]) => ({ seller, items: groupItems }));
}
