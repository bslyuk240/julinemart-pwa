'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { closeTopOverlay } from '@/lib/mobile/back-stack';
import { isNativeApp } from '@/lib/mobile/platform';

/**
 * Android Back button / gesture in the app:
 * open sheet → close it; history → go back; another page → Home; Home → exit.
 * Registering a listener replaces Capacitor's default (back or exit).
 */
export function NativeBackButton() {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (!isNativeApp()) return undefined;
    let remove: (() => void) | undefined;
    let cancelled = false;

    import('@capacitor/app')
      .then(({ App }) =>
        App.addListener('backButton', ({ canGoBack }) => {
          if (closeTopOverlay()) return;
          if (canGoBack) {
            window.history.back();
            return;
          }
          if (window.location.pathname !== '/') {
            routerRef.current.replace('/');
            return;
          }
          void App.exitApp();
        }),
      )
      .then((listener) => {
        if (cancelled) void listener.remove();
        else remove = () => void listener.remove();
      })
      .catch(() => {
        /* App plugin unavailable: keep Capacitor's default Back */
      });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  return null;
}
