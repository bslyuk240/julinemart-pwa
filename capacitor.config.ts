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
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT', // White text/icons
      backgroundColor: '#6b21a8', // Purple-700 to match your theme
      androidColoredNavigation: true, // Color the navigation bar too
    },
  },
};

export default config;
