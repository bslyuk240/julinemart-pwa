'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isFlowRoute } from '@/lib/mobile/mobile-tier-routes';

/**
 * True while a phone-width viewport is on a flow screen (checkout, gift box
 * builder). Timed prompts hold back instead of covering the form and Pay bar,
 * then appear once the shopper moves on. Desktop is never quiet.
 */
export function useQuietFlowRoute(): boolean {
  const pathname = usePathname();
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsPhone(mobile.matches);
    sync();
    mobile.addEventListener('change', sync);
    return () => mobile.removeEventListener('change', sync);
  }, []);

  return isPhone && isFlowRoute(pathname);
}
