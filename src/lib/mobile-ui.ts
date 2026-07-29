/**
 * Mobile-first storefront UI conventions (account + shop flows).
 *
 * Typography
 * - Page title (h1): text-base md:text-xl font-bold
 * - Section title (h2): text-sm md:text-base font-semibold
 * - Empty state title: text-sm md:text-base font-semibold
 * - Subtitle / meta: text-xs md:text-sm text-gray-600
 * - Stat values: text-lg md:text-xl font-bold
 *
 * Layout
 * - Page padding: py-5 md:py-6
 * - Cards: rounded-2xl shadow-sm p-4 (md:p-6 where needed)
 * - Page header: PageHeader / AccountPageHeader (icon back + title row)
 *
 * Buttons
 * - Primary/secondary actions: Button size="sm"
 * - Full-width mobile CTAs: size="sm" + fullWidth
 * - Utility actions: icon-only w-9 h-9 rounded-xl (aria-label required)
 * - Form rows: flex-col sm:flex-row gap-2
 *
 * Icons
 * - Inline action icons: w-3.5 h-3.5
 * - Icon button icons: w-4 h-4
 * - Decorative section icons: w-5 h-5
 *
 * Currency: ₦{amount.toLocaleString()}
 */

export const mobilePageTitle = 'text-base md:text-xl font-bold text-gray-900 leading-tight';
export const mobileSectionTitle = 'text-sm md:text-base font-semibold text-gray-900';
export const mobileSubtitle = 'text-xs md:text-sm text-gray-600';
export const mobileCard = 'bg-white rounded-2xl shadow-sm p-4';
export const mobileIconButton =
  'flex-shrink-0 w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-95';
export const mobilePrimaryIconButton =
  'flex-shrink-0 w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center hover:bg-primary-700 transition-colors active:scale-95 disabled:opacity-50';
