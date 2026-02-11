'use client';

import { useEffect } from 'react';

export function StatusBarManager() {
  useEffect(() => {
    const setupStatusBar = async () => {
      // Only run on mobile platforms
      if (typeof window === 'undefined') return;
      
      try {
        const { StatusBar } = await import('@capacitor/status-bar');
        const { Capacitor } = await import('@capacitor/core');
        
        // Check if running on a native platform
        if (Capacitor.isNativePlatform()) {
          // Disable overlay mode so status bar doesn't overlap content
          await StatusBar.setOverlaysWebView({ overlay: false });
          
          // Set status bar to match your purple theme
          await StatusBar.setBackgroundColor({ color: '#77088a' }); // Match banner purple
          await StatusBar.setStyle({ style: 'LIGHT' }); // White text/icons
          
          // Show the status bar (in case it was hidden)
          await StatusBar.show();
          
          console.log('✅ Status bar configured (non-overlay mode)');
        }
      } catch (error) {
        // Silently fail if status bar plugin is not available
        console.log('Status bar plugin not available');
      }
    };

    setupStatusBar();
  }, []);

  return null; // This component doesn't render anything
}
