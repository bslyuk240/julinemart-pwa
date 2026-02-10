import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.julinemart.app',
  appName: 'JulineMart',
  webDir: 'www',
  server: {
    url: 'https://julinemart.com',
    cleartext: false
  }
};

export default config;
