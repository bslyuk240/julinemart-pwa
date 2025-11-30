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
    const baseUrl = process.env.NEXT_PUBLIC_WP_URL;
    if (!baseUrl) return null;

    const endpoints = ['pages', 'posts', 'awsm_job_openings']; // include WP Job Openings CPT

    for (const endpoint of endpoints) {
      const response = await fetch(
        `${baseUrl}/wp-json/wp/v2/${endpoint}?slug=${slug}`,
        { next: { revalidate: 3600 } } // Cache 1 hour
      );

      if (!response.ok) continue;

      const data = await response.json();
      if (!data || data.length === 0) continue;

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
    }

    return null;
  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}

/**
 * Try multiple slugs and return the first page found
 */
export async function getPageBySlugs(slugs: string[]): Promise<WooPage | null> {
  for (const slug of slugs) {
    const page = await getPageBySlug(slug);
    if (page) return page;
  }
  return null;
}

/**
 * Get specific policy pages
 */
export async function getTermsAndConditions(): Promise<WooPage | null> {
  return getPageBySlugs(['terms-of-service', 'terms-and-conditions']);
}

export async function getPrivacyPolicy(): Promise<WooPage | null> {
  return getPageBySlug('privacy-policy');
}

export async function getRefundPolicy(): Promise<WooPage | null> {
  return getPageBySlugs([
    'refund_returns',
    'refund-and-returns-policy',
    'refund-policy',
  ]);
}

export async function getShippingPolicy(): Promise<WooPage | null> {
  return getPageBySlug('shipping-policy');
}
