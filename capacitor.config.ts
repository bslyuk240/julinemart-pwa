import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.julinemart.app',
  appName: 'JulineMart',
  webDir: 'out',
  server: {
    // Use Netlify dev-lab deployment for testing (has all latest changes + API routes)
    url: 'https://dev-lab--julinemart-pwa.netlify.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
