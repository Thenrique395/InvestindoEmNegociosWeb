import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'investindo-em-negocios-theme';
  private readonly isBrowser: boolean;
  private activeTheme: AppTheme = 'light';

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  init(): AppTheme {
    if (!this.isBrowser) return this.activeTheme;

    const storedTheme = this.readStoredTheme();
    const preferredTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return this.apply(storedTheme ?? preferredTheme, false);
  }

  toggle(): AppTheme {
    return this.apply(this.current() === 'light' ? 'dark' : 'light');
  }

  set(theme: AppTheme): void {
    this.apply(theme);
  }

  current(): AppTheme {
    if (!this.isBrowser || typeof document === 'undefined') return this.activeTheme;

    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  private apply(theme: AppTheme, persist = true): AppTheme {
    this.activeTheme = theme;
    if (!this.isBrowser || typeof document === 'undefined') return theme;

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');

    if (persist) {
      try {
        window.localStorage.setItem(this.storageKey, theme);
      } catch {}
    }

    return theme;
  }

  private readStoredTheme(): AppTheme | null {
    try {
      const storedTheme = window.localStorage.getItem(this.storageKey);
      return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
    } catch {
      return null;
    }
  }
}
