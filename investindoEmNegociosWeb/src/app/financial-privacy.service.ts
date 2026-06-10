import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class FinancialPrivacyService {
  private readonly storageKey = 'investindo-em-negocios-hide-financial-values';
  private readonly isBrowser: boolean;
  readonly hidden = signal(false);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  init(): void {
    if (!this.isBrowser) return;

    try {
      this.set(window.localStorage.getItem(this.storageKey) === 'true', false);
    } catch {
      this.set(false, false);
    }
  }

  toggle(): void {
    this.set(!this.hidden());
  }

  set(hidden: boolean, persist = true): void {
    this.hidden.set(hidden);

    if (!this.isBrowser || typeof document === 'undefined') return;
    document.documentElement.classList.toggle('financial-values-hidden', hidden);

    if (persist) {
      try {
        window.localStorage.setItem(this.storageKey, String(hidden));
      } catch {}
    }
  }
}
