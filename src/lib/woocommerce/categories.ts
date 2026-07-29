import { catalogGetCategories } from '@/lib/catalog/client';
import { Category, CategoryQueryParams } from '@/types/category';

/**
 * Category data now comes exclusively from the Supabase/JLO catalog
 * (catalog-meta?type=categories). WooCommerce has been retired — on a catalog
 * miss we return empty so callers fall back to their own static defaults
 * (e.g. CategoryStrip's FALLBACK_CATEGORIES). No WooCommerce calls are made.
 */

/**
 * Get all categories with optional filters.
 */
export async function getCategories(
  params: CategoryQueryParams = {}
): Promise<Category[]> {
  // Server-side only — catalogGetCategories returns null in the browser.
  const catalog = await catalogGetCategories();
  if (!catalog || catalog.length === 0) return [];

  let rows = catalog;
  if (params.parent !== undefined) {
    rows = rows.filter((c) => c.parent === Number(params.parent));
  }
  if (params.per_page !== undefined) {
    rows = rows.slice(0, Number(params.per_page));
  }
  return rows as unknown as Category[];
}

/**
 * Get a single category by ID
 */
export async function getCategory(id: number): Promise<Category | null> {
  const catalog = await catalogGetCategories();
  const match = catalog?.find((c) => c.id === Number(id));
  return (match as unknown as Category) ?? null;
}

/**
 * Get a category by slug
 */
export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  const catalog = await catalogGetCategories();
  const match = catalog?.find((c) => c.slug === slug);
  return (match as unknown as Category) ?? null;
}

/**
 * Get top-level categories (parent = 0)
 */
export async function getTopLevelCategories(
  perPage: number = 20
): Promise<Category[]> {
  return getCategories({ parent: 0, per_page: perPage, hide_empty: true });
}

/**
 * Get subcategories of a parent category
 */
export async function getSubcategories(
  parentId: number,
  perPage: number = 20
): Promise<Category[]> {
  return getCategories({ parent: parentId, per_page: perPage });
}

/**
 * Get categories with products (non-empty)
 */
export async function getCategoriesWithProducts(
  perPage: number = 20
): Promise<Category[]> {
  return getCategories({ hide_empty: true, per_page: perPage });
}
