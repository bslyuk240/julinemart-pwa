import { catalogGetProducts, catalogGetTagsAudit } from '@/lib/catalog/client';
import { PRODUCT_TAGS } from '@/lib/constants';
import type { Product, ProductsQueryParams } from '@/types/product';

/** Stable numeric id for UI keys (tags use UUID in Supabase). */
function tagIdToNumber(id: string, slug: string): number {
  const seed = id || slug;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

/** Homepage / ops tags — not customer-facing “brands”. */
const INTERNAL_TAG_SLUGS = new Set<string>([
  PRODUCT_TAGS.FLASH_SALE,
  PRODUCT_TAGS.DEAL,
  PRODUCT_TAGS.TRENDING,
  PRODUCT_TAGS.NEW_ARRIVAL,
  PRODUCT_TAGS.FEATURED,
  PRODUCT_TAGS.BEST_SELLER,
  PRODUCT_TAGS.OFFICIAL_STORE,
  PRODUCT_TAGS.HANDMADE,
  PRODUCT_TAGS.MADE_IN_NIGERIA,
  PRODUCT_TAGS.CUSTOMISABLE,
  'sponsored',
  'launching-deals',
  'top-sellers',
  'electronics',
  'fashion',
]);

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  image?: {
    id: number;
    src: string;
    name: string;
    alt: string;
  };
  display?: string;
  menu_order?: number;
}

function mapTagToBrand(row: { id: string; name: string; slug: string; product_count: number }): Brand {
  return {
    id: tagIdToNumber(row.id, row.slug),
    name: row.name,
    slug: row.slug,
    description: '',
    count: row.product_count,
  };
}

async function loadBrandTags(): Promise<Brand[]> {
  const rows = await catalogGetTagsAudit();
  if (!rows) return [];

  return rows
    .filter((row) => row.slug && !INTERNAL_TAG_SLUGS.has(row.slug))
    .filter((row) => row.product_count > 0)
    .map(mapTagToBrand);
}

export async function getBrands(params: {
  per_page?: number;
  page?: number;
  search?: string;
  hide_empty?: boolean;
  orderby?: 'name' | 'count' | 'menu_order';
  order?: 'asc' | 'desc';
} = {}): Promise<Brand[]> {
  const {
    per_page = 100,
    page = 1,
    search,
    hide_empty = true,
    orderby = 'name',
    order = 'asc',
  } = params;

  let brands = await loadBrandTags();
  if (hide_empty) brands = brands.filter((b) => b.count > 0);

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    brands = brands.filter(
      (b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q)
    );
  }

  brands.sort((a, b) => {
    if (orderby === 'count') {
      return order === 'desc' ? b.count - a.count : a.count - b.count;
    }
    const cmp = a.name.localeCompare(b.name);
    return order === 'desc' ? -cmp : cmp;
  });

  const start = (page - 1) * per_page;
  return brands.slice(start, start + per_page);
}

export async function getBrand(id: number): Promise<Brand | null> {
  const brands = await loadBrandTags();
  return brands.find((b) => b.id === id) ?? null;
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const brands = await loadBrandTags();
  return brands.find((b) => b.slug === slug) ?? null;
}

export async function getTopBrands(limit: number = 12): Promise<Brand[]> {
  const brands = await getBrands({
    per_page: 100,
    hide_empty: true,
    orderby: 'count',
    order: 'desc',
  });
  return brands.slice(0, limit);
}

export async function getFeaturedBrands(limit: number = 12): Promise<Brand[]> {
  return getTopBrands(limit);
}

export async function getProductsByBrand(
  brandSlug: string,
  params: {
    per_page?: number;
    page?: number;
    orderby?: ProductsQueryParams['orderby'];
    order?: string;
  } = {}
): Promise<Product[]> {
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return [];

  const products = await catalogGetProducts({
    tag: brandSlug,
    per_page: params.per_page ?? 20,
    page: params.page ?? 1,
    ...(params.orderby ? { orderby: params.orderby } : {}),
    ...(params.order ? { order: params.order as 'asc' | 'desc' } : {}),
  });

  return products ?? [];
}

export async function searchBrands(query: string): Promise<Brand[]> {
  return getBrands({ search: query, per_page: 20, hide_empty: true });
}
