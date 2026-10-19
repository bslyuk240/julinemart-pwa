// Pull-to-refresh without a page reload (docs/mobile-tier-plan.md, M15).
// Pages that fetch their own data register a refetch; GlobalPullToRefresh runs
// the most recent one. Routes decide what a pull does via pullRefreshMode().

type RefreshFn = () => Promise<void> | void;

const handlers: { id: number; refresh: RefreshFn }[] = [];
let nextId = 1;

/** Register the current screen's refetch. Returns an unregister function. */
export function registerSoftRefresh(refresh: RefreshFn): () => void {
  const id = nextId++;
  handlers.push({ id, refresh });
  return () => {
    const index = handlers.findIndex((entry) => entry.id === id);
    if (index !== -1) handlers.splice(index, 1);
  };
}

/** Run the most recently registered refetch. Resolves false when no screen registered one. */
export async function runSoftRefresh(): Promise<boolean> {
  const top = handlers[handlers.length - 1];
  if (!top) return false;
  await top.refresh();
  return true;
}

export type PullRefreshMode =
  /** No pull-to-refresh: a reload would throw away what the shopper typed or picked. */
  | 'off'
  /** Server-rendered page: re-render it in place with router.refresh(). */
  | 'server'
  /** Use the screen's registered refetch, or fall back to a full reload when it has none. */
  | 'soft';

// Forms and multi-step flows. Prefix entries end with '/'; RegExp entries match the whole path.
const OFF_ROUTES: (string | RegExp)[] = [
  '/checkout',
  '/gifts/build',
  '/gifts/checkout',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/contact',
  '/search',
  '/account/settings',
  '/account/addresses',
  /^\/account\/orders\/[^/]+\/(return|refund)(\/|$)/, // return / refund request forms
  /^\/returns\/[^/]+\/add-tracking$/, // tracking number form
  '/auth/', // sign-in callbacks: a reload would replay the one-time code
  '/account-deletion',
  '/vendor/', // the store page runs its own pull-to-refresh
  '/vendors', // store directory: keeps its search and filters (was excluded before M15 too)
];

// Server-rendered pages (and the locally stored cart): router.refresh() keeps client state such as a
// chosen product variant, where a reload would drop it.
const SERVER_ROUTES = ['/categories', '/brands', '/brand/', '/page/', '/product/', '/cart'];

function matches(pathname: string, route: string | RegExp): boolean {
  if (route instanceof RegExp) return route.test(pathname);
  return route.endsWith('/') ? pathname.startsWith(route) : pathname === route || pathname.startsWith(`${route}/`);
}

export function pullRefreshMode(pathname: string | null | undefined): PullRefreshMode {
  if (!pathname) return 'soft';
  if (OFF_ROUTES.some((route) => matches(pathname, route))) return 'off';
  if (SERVER_ROUTES.some((route) => matches(pathname, route))) return 'server';
  return 'soft';
}
