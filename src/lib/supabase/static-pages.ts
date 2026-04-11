import { getSupabaseServerClient } from '@/lib/supabase-server';

export interface StaticPage {
  id: string;
  title: string;
  content: string;
  slug: string;
  date: string;
  modified: string;
  link: string;
  seo_title: string | null;
  seo_description: string | null;
  is_active: boolean;
  source: 'supabase';
}

const STATIC_PAGE_TABLE = 'static_pages';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabasePage(row: any): StaticPage {
  const slug = String(row.slug ?? '').trim();
  const createdAt = String(row.created_at ?? row.date_created ?? row.updated_at ?? '');
  const updatedAt = String(row.updated_at ?? row.modified_at ?? row.created_at ?? '');

  return {
    id: String(row.id ?? slug),
    title: String(row.title ?? '').trim(),
    content: String(row.content ?? ''),
    slug,
    date: createdAt,
    modified: updatedAt,
    link: row.link ?? `/page/${slug}`,
    seo_title: row.seo_title ?? null,
    seo_description: row.seo_description ?? null,
    is_active: Boolean(row.is_active ?? true),
    source: 'supabase',
  };
}

async function getSupabasePageBySlug(slug: string): Promise<StaticPage | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(STATIC_PAGE_TABLE)
      .select('id,title,content,slug,created_at,updated_at,seo_title,seo_description,is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error(`[static-pages] error reading ${slug} from Supabase`, error);
      return null;
    }

    return data ? mapSupabasePage(data) : null;
  } catch (error) {
    console.error(`[static-pages] unexpected Supabase error for ${slug}`, error);
    return null;
  }
}

/**
 * Get page by slug from Supabase.
 */
export async function getPageBySlug(slug: string): Promise<StaticPage | null> {
  return getSupabasePageBySlug(slug);
}

/**
 * Try multiple slugs and return the first page found.
 */
export async function getPageBySlugs(slugs: string[]): Promise<StaticPage | null> {
  for (const slug of slugs) {
    const page = await getPageBySlug(slug);
    if (page) return page;
  }

  return null;
}

export async function getTermsAndConditions(): Promise<StaticPage | null> {
  return getPageBySlugs(['terms-of-service', 'terms-and-conditions']);
}

export async function getPrivacyPolicy(): Promise<StaticPage | null> {
  return getPageBySlug('privacy-policy');
}

export async function getRefundPolicy(): Promise<StaticPage | null> {
  return getPageBySlugs([
    'refund_returns',
    'refund-and-returns-policy',
    'refund-policy',
  ]);
}

export async function getShippingPolicy(): Promise<StaticPage | null> {
  return getPageBySlug('shipping-policy');
}
