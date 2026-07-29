'use client';

import { useEffect } from 'react';

export function StatusBarManager() {
  useEffect(() => {
    const setupSystemBars = async () => {
      if (typeof window === 'undefined') return;
      // window.Capacitor is only injected by the real iOS/Android native bridge.
      // Importing @capacitor/core in a plain browser (including Facebook's in-app
      // browser on iOS) triggers its LCP observer which then crashes trying to call
      // window.webkit.messageHandlers — so bail out before the import.
      if (!(window as unknown as { Capacitor?: unknown }).Capacitor) return;

      try {
        const { Capacitor, SystemBars, SystemBarsStyle } = await import('@capacitor/core');

        if (Capacitor.isNativePlatform()) {
          // Purple theme-color tints the Android status bar dark; use white so icons stay visible.
          document.documentElement.style.backgroundColor = '#ffffff';
          const themeColorMeta = document.querySelector('meta[name="theme-color"]');
          if (themeColorMeta) {
            themeColorMeta.setAttribute('content', '#ffffff');
          }

          await SystemBars.setStyle({ style: SystemBarsStyle.Light });
          await SystemBars.show();
        }
      } catch {
        console.log('System bars plugin not available');
      }
    };

    setupSystemBars();
  }, []);

  return null;
}
