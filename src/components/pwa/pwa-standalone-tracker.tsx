'use client';

import { useEffect } from 'react';
import { getOrCreateAnonymousId } from '@/lib/analytics/anonymous-id';

// Tracks when a user opens JulineMart from the installed PWA icon (standalone mode).
// Fires once per session to avoid duplicate events.
export default function PWAStandaloneTracker() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) return;

    // Only fire once per browser session
    const sessionKey = 'jm_standalone_tracked';
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    const platform = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios_pwa' : 'android_pwa';

    fetch('/api/analytics/pwa-install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'pwa_opened_standalone',
        platform,
        is_standalone: true,
        anonymous_id: getOrCreateAnonymousId(),
        source_page: window.location.pathname,
      }),
    }).catch(() => {});
  }, []);

  return null;
}
