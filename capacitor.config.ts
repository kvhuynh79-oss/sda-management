import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mysdamanager.app',
  appName: 'MySDAManager',
  webDir: 'out',
  server: {
    url: 'https://mysdamanager.com',
    cleartext: false,
  },
  ios: {
    scheme: 'MySDAManager',
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#111827',
    },
  },
};

export default config;
