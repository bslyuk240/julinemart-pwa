import { useEffect, useRef } from 'react';
import { registerSoftRefresh } from '@/lib/mobile/soft-refresh';

/**
 * Let pull-to-refresh refetch this screen's data instead of reloading the page.
 * The latest `refresh` is always used, so it can close over current state.
 */
export function useSoftRefresh(refresh: () => Promise<void> | void) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  useEffect(() => registerSoftRefresh(() => refreshRef.current()), []);
}
