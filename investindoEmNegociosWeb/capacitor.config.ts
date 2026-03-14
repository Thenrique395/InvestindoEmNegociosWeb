import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.investindoemnegocios.app',
  appName: 'Investindo em Negócios',
  webDir: 'dist/investindo-em-negocios-web/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
