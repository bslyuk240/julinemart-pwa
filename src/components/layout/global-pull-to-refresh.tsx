'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { getMobileTierRoute } from '@/lib/mobile/mobile-tier-routes';
import { pullRefreshMode, runSoftRefresh } from '@/lib/mobile/soft-refresh';
import { haptic } from '@/lib/mobile/haptics';

interface GlobalPullToRefreshProps {
  children: ReactNode;
}

const THRESHOLD = 70;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function GlobalPullToRefresh({ children }: GlobalPullToRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Forms and flows (checkout, sign-in, gift builder…) never refresh on a pull: it would lose input.
  const mode = pullRefreshMode(pathname);
  const tier = getMobileTierRoute(pathname) !== null;

  const onRefresh = useCallback(async () => {
    if (mode === 'server') {
      // Server-rendered page: re-render in place, keeping scroll and client state.
      router.refresh();
      await wait(600);
      return;
    }
    // The screen's own refetch, when it registered one (M15)…
    if (await runSoftRefresh()) return;
    // …otherwise a full reload, as before.
    await wait(150);
    window.location.reload();
  }, [mode, router]);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    disabled: mode === 'off',
    onRefresh,
    targetRef: scrollRef,
  });

  const armed = pullDistance >= THRESHOLD;
  // One tick when the pull passes the point where letting go refreshes.
  const wasArmedRef = useRef(false);
  useEffect(() => {
    if (armed && !wasArmedRef.current) haptic('selection');
    wasArmedRef.current = armed;
  }, [armed]);

  // Screen readers: "Refreshing", then "Updated" (the live region stays mounted so both are announced).
  const [announcement, setAnnouncement] = useState('');
  const wasRefreshingRef = useRef(false);
  useEffect(() => {
    if (isRefreshing === wasRefreshingRef.current) return;
    wasRefreshingRef.current = isRefreshing;
    const timer = window.setTimeout(() => setAnnouncement(isRefreshing ? 'Refreshing' : 'Updated'), 0);
    return () => window.clearTimeout(timer);
  }, [isRefreshing]);

  // Rubber-band past the threshold so the indicator slows down instead of running away.
  const travel = pullDistance <= THRESHOLD ? pullDistance : THRESHOLD + (pullDistance - THRESHOLD) * 0.3;

  return (
    <div
      ref={scrollRef}
      className="w-full min-h-0 touch-pan-y md:touch-auto"
    >
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {(pullDistance > 0 || isRefreshing) &&
        (tier ? (
          // Material pull-to-refresh: a circular indicator that slides out from under the top bar and
          // follows the finger. Same layer as the top bar but earlier in the DOM, so it starts hidden behind
          // the bar and floats over the content and chips below it.
          <div
            aria-hidden
            className={`pointer-events-none fixed left-1/2 z-m-header grid h-10 w-10 place-items-center rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.2),0_2px_6px_rgb(0_0_0/0.12)] ${
              armed || isRefreshing ? 'bg-m-primary text-m-on-primary' : 'bg-m-surface-lowest text-m-primary'
            } ${pullDistance > 0 ? '' : 'transition-transform duration-200 ease-m-standard'}`}
            style={{
              top: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 4rem)',
              transform: `translate(-50%, ${isRefreshing ? 24 : travel * 0.8 - 40}px) scale(${isRefreshing ? 1 : 0.85 + Math.min(pullDistance / THRESHOLD, 1) * 0.15})`,
            }}
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
              style={isRefreshing ? undefined : { transform: `rotate(${travel * 3}deg)` }}
              aria-hidden
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-full bg-white shadow px-3 py-1 text-xs text-gray-700"
            style={{
              top: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.5rem)',
              transform: `translate(-50%, ${Math.min(pullDistance, 40)}px)`,
            }}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isRefreshing ? 'bg-primary-600 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span>{isRefreshing ? 'Refreshing...' : armed ? 'Release to refresh' : 'Pull to refresh'}</span>
          </div>
        ))}
      {children}
    </div>
  );
}
