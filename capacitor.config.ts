import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.julinemart.app',
  appName: 'JulineMart',
  webDir: 'out',
  server: {
    // Use production deployment for Android app
    url: 'https://julinemart-pwa.netlify.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
