import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'investindo-em-negocios-theme';
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  init(): AppTheme {
    this.applyLight();
    return 'light';
  }

  toggle(): AppTheme {
    this.applyLight();
    return 'light';
  }

  set(_theme: AppTheme): void {
    this.applyLight();
  }

  current(): AppTheme {
    return 'light';
  }

  private applyLight(): void {
    if (!this.isBrowser || typeof document === 'undefined') return;

    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('theme-dark');

    try {
      window.localStorage.setItem(this.storageKey, 'light');
    } catch {}
  }

}
