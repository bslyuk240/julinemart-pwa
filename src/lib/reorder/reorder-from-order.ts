import type { Product } from '@/types/product';
import type { CartItem } from '@/store/cart-store';

export type ReorderLineItem = {
  product_id?: string | number;
  variation_id?: string | number | null;
  product_name?: string;
  quantity?: number;
};

type CatalogProductResponse = {
  product?: Record<string, unknown>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

async function fetchProductForReorder(productId: string | number): Promise<Product | null> {
  const idStr = String(productId).trim();
  if (!idStr) return null;

  try {
    const qs = isUuid(idStr)
      ? `id=${encodeURIComponent(idStr)}`
      : `woo_id=${encodeURIComponent(idStr)}`;
    const res = await fetch(`/api/catalog/product?${qs}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as CatalogProductResponse;
    const row = json.product;
    if (!row) return null;

    const images = Array.isArray(row.images)
      ? row.images.map((img: Record<string, unknown>, idx: number) => ({
          id: typeof img.id === 'number' ? img.id : idx,
          date_created: '',
          date_modified: '',
          src: String(img.src ?? ''),
          name: String(img.name ?? ''),
          alt: String(img.alt ?? ''),
        }))
      : [];

    const variations = Array.isArray(row.variations)
      ? row.variations.map((v: Record<string, unknown>, idx: number) => {
          const attrs = Array.isArray(v.attributes)
            ? v.attributes.map((a: Record<string, unknown>) => ({
                id: 0,
                name: String(a.name ?? ''),
                option: String(a.value ?? a.option ?? ''),
              }))
            : [];
          const varImages = Array.isArray(v.product_images) ? v.product_images : [];
          const thumb = varImages[0] as Record<string, unknown> | undefined;
          return {
            id: Number(v.woo_variation_id) || idx + 1,
            supabaseId: v.id ? String(v.id) : undefined,
            sku: String(v.sku ?? ''),
            price: String(v.sale_price ?? v.regular_price ?? '0'),
            regular_price: String(v.regular_price ?? '0'),
            sale_price: v.sale_price != null ? String(v.sale_price) : '',
            stock_quantity: v.stock_quantity != null ? Number(v.stock_quantity) : null,
            stock_status: (v.stock_status as Product['stock_status']) || 'instock',
            attributes: attrs,
            image: thumb?.src
              ? {
                  id: 0,
                  date_created: '',
                  date_modified: '',
                  src: String(thumb.src),
                  name: '',
                  alt: '',
                }
              : undefined,
          };
        })
      : undefined;

    const wooId = Number(row.woo_product_id) || 0;
    return {
      id: wooId || 1,
      supabaseId: row.id ? String(row.id) : undefined,
      name: String(row.name ?? ''),
      slug: String(row.slug ?? ''),
      type: (row.type as Product['type']) || 'simple',
      status: 'publish',
      featured: false,
      catalog_visibility: 'visible',
      description: String(row.description ?? ''),
      short_description: String(row.short_description ?? ''),
      sku: String(row.sku ?? ''),
      price: String(row.sale_price ?? row.regular_price ?? '0'),
      regular_price: String(row.regular_price ?? '0'),
      sale_price: row.sale_price != null ? String(row.sale_price) : '',
      on_sale: Boolean(row.sale_price && row.regular_price && row.sale_price !== row.regular_price),
      purchasable: true,
      total_sales: 0,
      virtual: false,
      downloadable: false,
      tax_status: 'taxable',
      tax_class: '',
      manage_stock: false,
      stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
      stock_status: (row.stock_status as Product['stock_status']) || 'instock',
      backorders: 'no',
      backorders_allowed: false,
      backordered: false,
      sold_individually: false,
      weight: String(row.weight ?? ''),
      dimensions: { length: '', width: '', height: '' },
      shipping_required: true,
      shipping_taxable: true,
      shipping_class: '',
      shipping_class_id: 0,
      reviews_allowed: true,
      average_rating: '0',
      rating_count: 0,
      related_ids: [],
      upsell_ids: [],
      cross_sell_ids: [],
      parent_id: 0,
      purchase_note: '',
      categories: [],
      tags: [],
      images,
      attributes: [],
      default_attributes: [],
      variations: variations?.map((v) => v.id) ?? [],
      grouped_products: [],
      menu_order: 0,
      meta_data: [],
      date_created: String(row.created_at ?? ''),
      date_modified: String(row.updated_at ?? ''),
      permalink: '',
      _variations: variations,
    } as unknown as Product;
  } catch {
    return null;
  }
}

export type AddToCartFn = CartItem extends infer _T
  ? (
      product: Product,
      quantity?: number,
      variation?: {
        id: number;
        supabaseId?: string;
        attributes: Record<string, string>;
        price: number;
        regularPrice: number;
        salePrice?: number;
        image?: string;
        sku?: string;
        stockQuantity: number | null;
        stockStatus: 'instock' | 'outofstock' | 'onbackorder';
      }
    ) => void
  : never;

export async function reorderLinesToCart(
  lines: ReorderLineItem[],
  addItem: AddToCartFn
): Promise<{ added: number; skipped: string[] }> {
  const skipped: string[] = [];
  let added = 0;

  for (const line of lines) {
    const qty = Math.max(1, Number(line.quantity) || 1);
    const product = await fetchProductForReorder(line.product_id ?? '');
    if (!product || product.stock_status === 'outofstock') {
      skipped.push(line.product_name || 'Unavailable item');
      continue;
    }

    const variationKey = line.variation_id ? String(line.variation_id) : '';
    if (product.type === 'variable' && variationKey && product._variations?.length) {
      const variation = product._variations.find(
        (v) => v.supabaseId === variationKey || String(v.id) === variationKey
      );
      if (variation) {
        addItem(product, qty, {
          id: variation.id,
          supabaseId: variation.supabaseId,
          attributes: Object.fromEntries(
            variation.attributes.map((a) => [a.name, a.option])
          ),
          price: parseFloat(variation.price || variation.regular_price || '0'),
          regularPrice: parseFloat(variation.regular_price || '0'),
          salePrice: variation.sale_price ? parseFloat(variation.sale_price) : undefined,
          image: variation.image?.src,
          sku: variation.sku,
          stockQuantity: variation.stock_quantity,
          stockStatus: variation.stock_status,
        });
        added += 1;
        continue;
      }
    }

    addItem(product, qty);
    added += 1;
  }

  return { added, skipped };
}
