import { wcApi, handleApiError, WooCommerceResponse } from './client';
import { Product, ProductsQueryParams, ProductVariation, ProductReview } from '@/types/product';

/**
 * Get all products with optional filters
 * FIXED: Handles tag slug to ID conversion for WooCommerce compatibility
 */
export async function getProducts(
  params: ProductsQueryParams = {}
): Promise<Product[]> {
  try {
    // If filtering by tag slug, convert to tag ID first
    if (params.tag && isNaN(Number(params.tag))) {
      // It's a slug, not an ID
      const tagId = await getTagIdBySlug(params.tag);
      if (tagId) {
        params.tag = tagId.toString();
      } else {
        console.warn(`Tag slug "${params.tag}" not found, returning empty array`);
        return [];
      }
    }

    const response = await wcApi.get('products', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Helper: Get tag ID by slug
 */
async function getTagIdBySlug(slug: string): Promise<number | null> {
  try {
    const response = await wcApi.get('products/tags', { slug });
    if (response.data && response.data.length > 0) {
      return response.data[0].id;
    }
    return null;
  } catch (error) {
    handleApiError(error, `Error fetching tag ID for slug "${slug}"`);
    return null;
  }
}

/**
 * Get a single product by ID
 */
export async function getProduct(id: number): Promise<Product | null> {
  try {
    const response = await wcApi.get(`products/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get reviews for a specific product
 */
export async function getProductReviews(
  productId: number,
  params: { page?: number; per_page?: number } = {}
): Promise<ProductReview[]> {
  try {
    const response = await wcApi.get('products/reviews', {
      product: productId,
      per_page: params.per_page ?? 20,
      page: params.page ?? 1,
      order: 'desc',
      orderby: 'date',
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Create a new product review
 */
export async function createProductReview(payload: {
  product_id: number;
  review: string;
  reviewer: string;
  reviewer_email: string;
  rating: number;
}): Promise<ProductReview | null> {
  try {
    const response = await wcApi.post('products/reviews', payload);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get variations for a variable product
 */
export async function getProductVariations(
  productId: number
): Promise<ProductVariation[]> {
  try {
    const response = await wcApi.get(`products/${productId}/variations`, {
      per_page: 100,
      status: 'publish',
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Get a product by slug
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const response = await wcApi.get('products', { slug });
    return response.data[0] || null;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get featured products
 */
export async function getFeaturedProducts(
  perPage: number = 10
): Promise<Product[]> {
  return getProducts({ featured: true, per_page: perPage });
}

/**
 * Get products on sale
 */
export async function getSaleProducts(
  perPage: number = 10
): Promise<Product[]> {
  return getProducts({ on_sale: true, per_page: perPage });
}

/**
 * Get products by category
 */
export async function getProductsByCategory(
  categoryId: number,
  params: ProductsQueryParams = {}
): Promise<Product[]> {
  return getProducts({ category: categoryId.toString(), ...params });
}

/**
 * Get products by tag
 */
export async function getProductsByTag(
  tag: string,
  params: ProductsQueryParams = {}
): Promise<Product[]> {
  return getProducts({ tag, ...params });
}

/**
 * Get related products
 */
export async function getRelatedProducts(
  productId: number,
  limit: number = 4
): Promise<Product[]> {
  try {
    const product = await getProduct(productId);
    if (!product || !product.related_ids.length) return [];
    
    return getProducts({
      include: product.related_ids.slice(0, limit),
      per_page: limit,
    });
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Search products
 */
export async function searchProducts(
  query: string,
  params: ProductsQueryParams = {}
): Promise<Product[]> {
  return getProducts({ search: query, ...params });
}

/**
 * Get top selling products
 */
export async function getTopSellingProducts(
  perPage: number = 10
): Promise<Product[]> {
  return getProducts({ 
    orderby: 'popularity', 
    order: 'desc',
    per_page: perPage 
  });
}

/**
 * Get latest products
 */
export async function getLatestProducts(
  perPage: number = 10
): Promise<Product[]> {
  return getProducts({ 
    orderby: 'date', 
    order: 'desc',
    per_page: perPage 
  });
}

/**
 * Get products by vendor (WCFM)
 */
export async function getProductsByVendor(
  vendorId: number,
  params: ProductsQueryParams = {}
): Promise<Product[]> {
  // WCFM stores vendor ID in meta_data
  // You may need to adjust this based on your WCFM setup
  return getProducts({ 
    ...params,
    // This might need to be adjusted based on WCFM's implementation
  });
}
