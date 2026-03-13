'use client';

import { useEffect } from 'react';

export function StatusBarManager() {
  useEffect(() => {
    const setupSystemBars = async () => {
      if (typeof window === 'undefined') return;

      try {
        const { Capacitor, SystemBars, SystemBarsStyle } = await import('@capacitor/core');

        if (Capacitor.isNativePlatform()) {
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
