// The mobile tier rollout switch (docs/mobile-tier-plan.md §3 rule 4).
// A route listed here gets the mobile shell below `md`; everything else keeps
// today's chrome. Rolling a page back is deleting its line.

export type MobileTierRoute = {
  /** Exact path, or a prefix ending in `/*` (e.g. `/product/*`). */
  pattern: string;
  /** Show the bottom navigation bar. Flow screens (product, checkout) hide it. */
  tabBar: boolean;
};

const ROUTES: MobileTierRoute[] = [
  // Wave 1, one milestone at a time.
  { pattern: '/product/*', tabBar: false }, // M1
  { pattern: '/category/*', tabBar: true }, // M2
  { pattern: '/search', tabBar: false }, // M2: full-screen search
  { pattern: '/cart', tabBar: true }, // M3
  { pattern: '/checkout', tabBar: false }, // M3: layout only
];

const DEV_ROUTES: MobileTierRoute[] = [{ pattern: '/dev/mobile-shell', tabBar: true }];

export function matchesPattern(pattern: string, pathname: string): boolean {
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    return pathname.startsWith(`${base}/`) && pathname.length > base.length + 1;
  }
  return pathname === pattern;
}

export function getMobileTierRoute(
  pathname: string | null | undefined,
  routes: MobileTierRoute[] = process.env.NODE_ENV === 'production' ? ROUTES : [...ROUTES, ...DEV_ROUTES],
): MobileTierRoute | null {
  if (!pathname) return null;
  return routes.find((route) => matchesPattern(route.pattern, pathname)) ?? null;
}
