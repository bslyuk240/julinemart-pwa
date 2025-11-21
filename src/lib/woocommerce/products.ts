import { wcApi, handleApiError, WooCommerceResponse } from './client';
import { Product, ProductsQueryParams } from '@/types/product';

/**
 * Get all products with optional filters
 */
export async function getProducts(
  params: ProductsQueryParams = {}
): Promise<Product[]> {
  try {
    const response = await wcApi.get('products', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
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