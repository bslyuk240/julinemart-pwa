import { Product, ProductsQueryParams, ProductVariation, ProductReview } from '@/types/product';
import {
  catalogGetProducts,
  catalogGetProduct,
  catalogGetVariations,
} from '@/lib/catalog/client';

/**
 * Get all products with optional filters
 * DEV-LAB: Supabase/JLO catalog only — WooCommerce fallback disabled to surface missing data.
 */
export async function getProducts(
  params: ProductsQueryParams = {}
): Promise<Product[]> {
  const catalogProducts = await catalogGetProducts(params);
  return catalogProducts ?? [];
}

/**
 * Get products with pagination metadata (total, totalPages).
 * DEV-LAB: Supabase/JLO catalog only — WooCommerce fallback disabled to surface missing data.
 */
export async function getProductsWithPagination(
  params: ProductsQueryParams = {}
): Promise<{ products: Product[]; total: number; totalPages: number }> {
  const { catalogGetProductsWithMeta } = await import('@/lib/catalog/client');
  const catalogResult = await catalogGetProductsWithMeta(params);
  return catalogResult ?? { products: [], total: 0, totalPages: 0 };
}

/**
 * Get a single product by ID
 * ID-based lookup always uses WooCommerce — catalog-product expects a slug.
 */
export async function getProduct(id: number): Promise<Product | null> {
  const products = await catalogGetProducts({ include: [id], per_page: 1 });
  return products?.[0] ?? null;
}

/**
 * Get reviews for a specific product
 */
export async function getProductReviews(
  productId: number,
  params: { page?: number; per_page?: number } = {}
): Promise<ProductReview[]> {
  void productId;
  void params;
  return [];
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
  void payload;
  return null;
}

/**
 * Get variations for a variable product
 * DEV-LAB: Supabase/JLO catalog only — WooCommerce fallback disabled.
 */
export async function getProductVariations(
  productId: number
): Promise<ProductVariation[]> {
  const catalogVariations = await catalogGetVariations(productId);
  return catalogVariations ?? [];
}

/**
 * Get a product by slug
 * DEV-LAB: Supabase/JLO catalog only — WooCommerce fallback disabled.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  return catalogGetProduct(slug);
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
    console.error('Error fetching related products:', error);
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
