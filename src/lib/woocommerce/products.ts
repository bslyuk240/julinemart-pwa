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
 * Get approved reviews for a product (Supabase via Next.js API).
 */
export async function getProductReviews(
  productId: number,
  params: { page?: number; per_page?: number; supabaseId?: string } = {}
): Promise<ProductReview[]> {
  const qs = new URLSearchParams();
  if (params.supabaseId) qs.set('supabase_id', params.supabaseId);
  if (productId > 0) qs.set('woo_product_id', String(productId));
  if (!params.supabaseId && productId <= 0) return [];

  try {
    const res = await fetch(`/api/product-reviews?${qs}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { reviews?: ProductReview[] };
    return data.reviews ?? [];
  } catch {
    return [];
  }
}

/**
 * Submit a review (stored as `pending` until staff approves).
 */
export async function createProductReview(payload: {
  product_id: number;
  supabase_product_id?: string;
  review: string;
  reviewer: string;
  reviewer_email: string;
  rating: number;
}): Promise<ProductReview | null> {
  try {
    const res = await fetch('/api/product-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { review?: ProductReview };
    return data.review ?? null;
  } catch {
    return null;
  }
}

/**
 * Get variations for a variable product
 * DEV-LAB: Supabase/JLO catalog only — WooCommerce fallback disabled.
 */
export async function getProductVariations(
  productId: number
): Promise<ProductVariation[]> {
  if (typeof window !== 'undefined') {
    try {
      const qs = new URLSearchParams({ product_id: String(productId) });
      const res = await fetch(`/api/product-variations?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) return [];
      const data = (await res.json()) as { variations?: ProductVariation[] };
      return data.variations ?? [];
    } catch {
      return [];
    }
  }

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
