import { wcApi, handleApiError } from './client';

export interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number; // Number of products with this brand
  image?: {
    id: number;
    src: string;
    name: string;
    alt: string;
  };
  display?: string;
  menu_order?: number;
}

/**
 * Get all brands from WooCommerce Brands taxonomy
 * Works with WooCommerce Brands extension or Perfect Brands plugin
 */
export async function getBrands(params: {
  per_page?: number;
  page?: number;
  search?: string;
  hide_empty?: boolean;
  orderby?: 'name' | 'count' | 'menu_order';
  order?: 'asc' | 'desc';
} = {}): Promise<Brand[]> {
  try {
    const defaultParams = {
      per_page: 100,
      hide_empty: true,
      orderby: 'name',
      order: 'asc',
      ...params,
    };

    // WooCommerce Brands uses the 'products/brands' endpoint
    const response = await wcApi.get('products/brands', defaultParams);
    
    return response.data.map((brand: any) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      count: brand.count || 0,
      image: brand.image ? {
        id: brand.image.id,
        src: brand.image.src,
        name: brand.image.name || '',
        alt: brand.image.alt || brand.name,
      } : undefined,
      display: brand.display || 'default',
      menu_order: brand.menu_order || 0,
    }));
  } catch (error) {
    console.error('Error fetching brands:', error);
    handleApiError(error);
    return [];
  }
}

/**
 * Get a single brand by ID
 */
export async function getBrand(id: number): Promise<Brand | null> {
  try {
    const response = await wcApi.get(`products/brands/${id}`);
    const brand = response.data;
    
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      count: brand.count || 0,
      image: brand.image ? {
        id: brand.image.id,
        src: brand.image.src,
        name: brand.image.name || '',
        alt: brand.image.alt || brand.name,
      } : undefined,
      display: brand.display || 'default',
      menu_order: brand.menu_order || 0,
    };
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get a brand by slug
 */
export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  try {
    const response = await wcApi.get('products/brands', { slug });
    
    if (response.data && response.data.length > 0) {
      const brand = response.data[0];
      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description || '',
        count: brand.count || 0,
        image: brand.image ? {
          id: brand.image.id,
          src: brand.image.src,
          name: brand.image.name || '',
          alt: brand.image.alt || brand.name,
        } : undefined,
        display: brand.display || 'default',
        menu_order: brand.menu_order || 0,
      };
    }
    
    return null;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get top brands (brands with most products)
 */
export async function getTopBrands(limit: number = 12): Promise<Brand[]> {
  try {
    const brands = await getBrands({
      per_page: 100,
      hide_empty: true,
      orderby: 'count',
      order: 'desc',
    });
    
    // Return top N brands
    return brands.slice(0, limit);
  } catch (error) {
    console.error('Error getting top brands:', error);
    return [];
  }
}

/**
 * Get featured brands (based on menu_order)
 */
export async function getFeaturedBrands(limit: number = 12): Promise<Brand[]> {
  try {
    const brands = await getBrands({
      per_page: limit,
      hide_empty: true,
      orderby: 'menu_order',
      order: 'asc',
    });
    
    return brands;
  } catch (error) {
    console.error('Error getting featured brands:', error);
    return [];
  }
}

/**
 * Get products by brand
 */
export async function getProductsByBrand(
  brandSlug: string,
  params: {
    per_page?: number;
    page?: number;
    orderby?: string;
    order?: string;
  } = {}
): Promise<any[]> {
  try {
    const defaultParams = {
      per_page: 20,
      page: 1,
      orderby: 'popularity',
      order: 'desc',
      ...params,
    };

    // First, get the brand to get its ID
    const brand = await getBrandBySlug(brandSlug);
    
    if (!brand) {
      console.warn(`Brand "${brandSlug}" not found`);
      return [];
    }

    // Fetch products with this brand
    const response = await wcApi.get('products', {
      ...defaultParams,
      brand: brand.id.toString(),
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching products for brand "${brandSlug}":`, error);
    handleApiError(error);
    return [];
  }
}

/**
 * Search brands
 */
export async function searchBrands(query: string): Promise<Brand[]> {
  try {
    return await getBrands({
      search: query,
      per_page: 20,
      hide_empty: true,
    });
  } catch (error) {
    console.error('Error searching brands:', error);
    return [];
  }
}