export interface WooPage {
  id: number;
  title: string;
  content: string;
  slug: string;
  date: string;
  modified: string;
  link: string;
}

/**
 * Get page by slug
 */
export async function getPageBySlug(slug: string): Promise<WooPage | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/wp/v2/pages?slug=${slug}`,
      { next: { revalidate: 3600 } } // Cache 1 hour
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.length === 0) return null;
    
    const page = data[0];
    return {
      id: page.id,
      title: page.title.rendered,
      content: page.content.rendered,
      slug: page.slug,
      date: page.date,
      modified: page.modified,
      link: page.link,
    };
  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}

/**
 * Get specific policy pages
 */
export async function getTermsAndConditions(): Promise<WooPage | null> {
  return getPageBySlug('terms-and-conditions');
}

export async function getPrivacyPolicy(): Promise<WooPage | null> {
  return getPageBySlug('privacy-policy');
}

export async function getRefundPolicy(): Promise<WooPage | null> {
  return getPageBySlug('refund-policy');
}

export async function getShippingPolicy(): Promise<WooPage | null> {
  return getPageBySlug('shipping-policy');
}