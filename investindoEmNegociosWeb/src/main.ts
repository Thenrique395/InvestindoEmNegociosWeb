import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Grafana Faro (RUM): erros JS, web-vitals e navegação do navegador real.
// A URL do collector é injetada em runtime por /config.js (window.__FARO_URL__),
// então o build é único e o dado só é enviado quando a URL existe (gated).
const faroUrl =
  typeof window !== 'undefined' && window.__FARO_URL__ ? String(window.__FARO_URL__).trim() : '';
if (faroUrl) {
  try {
    initializeFaro({
      url: faroUrl,
      app: { name: 'InvestindoEmNegociosWeb', version: '1.0.0', environment: 'development' },
      instrumentations: [...getWebInstrumentations()],
    });
  } catch (e) {
    console.error('[Faro] falha ao inicializar', e);
  }
}

if (isDevMode() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
    if (regs.length > 0) {
      console.log(`[Dev] ${regs.length} service worker(s) removido(s)`);
    }
  });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
