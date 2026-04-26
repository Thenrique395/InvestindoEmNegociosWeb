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
    const saved = this.getSavedTheme();
    if (saved) {
      this.apply(saved, false);
      return saved;
    }

    const preferred = this.getPreferredTheme();
    this.apply(preferred, false);
    return preferred;
  }

  toggle(): AppTheme {
    const next: AppTheme = this.current() === 'dark' ? 'light' : 'dark';
    this.apply(next, true);
    return next;
  }

  set(theme: AppTheme): void {
    this.apply(theme, true);
  }

  current(): AppTheme {
    if (!this.isBrowser || typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('theme-dark')
      || document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light';
  }

  private apply(theme: AppTheme, animate: boolean): void {
    if (!this.isBrowser || typeof document === 'undefined') return;

    if (animate) {
      document.documentElement.classList.add('theme-transition');
    }

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');

    try {
      window.localStorage.setItem(this.storageKey, theme);
    } catch {}

    if (animate) {
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 300);
    }
  }

  private getSavedTheme(): AppTheme | null {
    if (!this.isBrowser || typeof window === 'undefined') return null;

    try {
      const value = window.localStorage.getItem(this.storageKey);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  private getPreferredTheme(): AppTheme {
    if (!this.isBrowser || typeof window === 'undefined') return 'light';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
