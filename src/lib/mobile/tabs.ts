export type TabId = 'home' | 'categories' | 'cart' | 'wishlist' | 'account';

export const TABS: { id: TabId; label: string; href: string }[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'categories', label: 'Categories', href: '/categories' },
  { id: 'cart', label: 'Cart', href: '/cart' },
  { id: 'wishlist', label: 'Wishlist', href: '/wishlist' },
  { id: 'account', label: 'Account', href: '/account' },
];

// Prefix matching, so a tab stays lit on its child screens.
const TAB_PREFIXES: Record<TabId, string[]> = {
  home: [],
  categories: ['/categories', '/category/', '/products', '/search', '/brand/', '/brands'],
  cart: ['/cart'],
  wishlist: ['/wishlist', '/account/wishlist'],
  account: ['/account', '/orders'],
};

/** Which tab is lit for a path, or null when none should be (e.g. /gifts). */
export function activeTab(pathname: string | null | undefined): TabId | null {
  if (!pathname) return null;
  if (pathname === '/') return 'home';
  // Wishlist before account: /account/wishlist belongs to the Wishlist tab.
  const order: TabId[] = ['wishlist', 'categories', 'cart', 'account'];
  for (const id of order) {
    if (
      TAB_PREFIXES[id].some((prefix) =>
        prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
      )
    ) {
      return id;
    }
  }
  return null;
}
