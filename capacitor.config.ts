import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.julinemart.app',
  appName: 'JulineMart',
  webDir: 'out',
  server: {
    // Production: Use custom domain
    url: 'https://julinemart.com',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    // Shown while the site loads, between the native splash and the web launch
    // animation, so that gap is brand purple instead of white.
    backgroundColor: '#77088a',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      style: 'LIGHT',
      hidden: false,
    },
  },
};

export default config;
