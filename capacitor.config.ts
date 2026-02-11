import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.julinemart.app',
  appName: 'JulineMart',
  webDir: 'out',
  server: {
    // Use dev-lab deployment for testing Android OAuth
    url: 'https://dev-lab--julinemart-pwa.netlify.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
