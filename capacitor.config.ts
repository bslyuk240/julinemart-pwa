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
  plugins: {
    StatusBar: {
      style: 'LIGHT', // White text/icons
      backgroundColor: '#6b21a8', // Purple-700 to match your theme
    },
  },
};

export default config;
