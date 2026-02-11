import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.julinemart.app',
  appName: 'JulineMart',
  webDir: 'out',
  server: {
    // Production URL for better performance and stability
    url: 'https://julinemart-pwa.netlify.app',
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
