'use client';

import { ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

interface GlobalPullToRefreshProps {
  children: ReactNode;
}

export default function GlobalPullToRefresh({ children }: GlobalPullToRefreshProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { pullDistance, isRefreshing } = usePullToRefresh({
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
      className="min-h-screen overscroll-contain"
      style={{ touchAction: 'pan-y' }}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-full bg-white shadow px-3 py-1 text-xs text-gray-700"
          style={{ transform: `translate(-50%, ${Math.min(pullDistance, 40)}px)` }}
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
