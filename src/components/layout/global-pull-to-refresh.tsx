'use client';

import { ReactNode, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

interface GlobalPullToRefreshProps {
  children: ReactNode;
}

export default function GlobalPullToRefresh({ children }: GlobalPullToRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const vendorPullHandledLocally = pathname.startsWith('/vendor');

  const { pullDistance, isRefreshing } = usePullToRefresh({
    disabled: vendorPullHandledLocally,
    onRefresh: async () => {
      // Force a full page reload to ensure data/state is fresh
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (typeof window !== 'undefined') {
        window.location.reload();
      } else {
        router.refresh();
      }
    },
    targetRef: scrollRef,
  });

  return (
    <div
      ref={scrollRef}
      className="w-full min-h-0 touch-pan-y md:touch-auto"
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
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
          <span>{isRefreshing ? 'Refreshing...' : pullDistance >= 70 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      )}
      {children}
    </div>
  );
}
