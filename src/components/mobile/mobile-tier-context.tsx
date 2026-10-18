'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { MobileTierRoute } from '@/lib/mobile/mobile-tier-routes';

const MobileTierContext = createContext<MobileTierRoute | null>(null);

/** Provided by ConditionalChrome from the pathname, so SSR and client agree. */
export function MobileTierProvider({ route, children }: { route: MobileTierRoute | null; children: ReactNode }) {
  return <MobileTierContext.Provider value={route}>{children}</MobileTierContext.Provider>;
}

/**
 * The current route's mobile tier config, or null when the route is not on the
 * allowlist. Pages gate their mobile-only pieces on this (plus `md:hidden` /
 * `max-md:` classes), so removing a route from the allowlist fully reverts it.
 */
export function useMobileTier(): MobileTierRoute | null {
  return useContext(MobileTierContext);
}
