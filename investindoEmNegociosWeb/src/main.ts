import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

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
