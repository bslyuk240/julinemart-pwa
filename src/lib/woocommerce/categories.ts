import { wcApi, handleApiError } from './client';
import { Category, CategoryQueryParams } from '@/types/category';

/**
 * Get all categories with optional filters
 */
export async function getCategories(
  params: CategoryQueryParams = {}
): Promise<Category[]> {
  try {
    const response = await wcApi.get('products/categories', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Get a single category by ID
 */
export async function getCategory(id: number): Promise<Category | null> {
  try {
    const response = await wcApi.get(`products/categories/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get a category by slug
 */
export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  try {
    const response = await wcApi.get('products/categories', { slug });
    return response.data[0] || null;
  } catch (error) {
    handleApiError(error);
    return null;
  }
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