import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

/**
 * Lightweight pull-to-refresh for mobile web.
 * Listens to touch events at the top of the page and triggers a refresh callback.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 140,
  disabled = false,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const distanceRef = useRef(0);

  useEffect(() => {
    if (disabled) return undefined;

    const handleStart = (event: TouchEvent) => {
      if (isRefreshing) return;
      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
      if (scrollTop > 0) return;

      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
    };

    const handleMove = (event: TouchEvent) => {
      if (!pullingRef.current || startYRef.current === null) return;
      const currentY = event.touches[0].clientY;
      const delta = currentY - startYRef.current;

      if (delta > 0) {
        const distance = Math.min(delta, maxPull);
        distanceRef.current = distance;
        setPullDistance(distance);
      } else {
        distanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleEnd = async () => {
      if (!pullingRef.current) return;

      pullingRef.current = false;
      const shouldRefresh = distanceRef.current >= threshold;
      distanceRef.current = 0;
      setPullDistance(0);

      if (shouldRefresh && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    window.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [onRefresh, threshold, maxPull, disabled, isRefreshing]);

  return { pullDistance, isRefreshing };
}
