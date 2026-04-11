export {
  getPageBySlug,
  getPageBySlugs,
  getTermsAndConditions,
  getPrivacyPolicy,
  getRefundPolicy,
  getShippingPolicy,
} from '@/lib/supabase/static-pages';

export type { StaticPage as WooPage } from '@/lib/supabase/static-pages';
