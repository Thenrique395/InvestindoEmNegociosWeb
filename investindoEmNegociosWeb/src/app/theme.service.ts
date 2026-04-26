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
      this.apply(saved);
      return saved;
    }

    const preferred = this.getPreferredTheme();
    this.apply(preferred);
    return preferred;
  }

  toggle(): AppTheme {
    const next: AppTheme = this.current() === 'dark' ? 'light' : 'dark';
    this.apply(next);
    return next;
  }

  set(theme: AppTheme): void {
    this.apply(theme);
  }

  current(): AppTheme {
    if (!this.isBrowser || typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('theme-dark')
      || document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light';
  }

  isLight(): boolean {
    return this.current() === 'light';
  }

  private apply(theme: AppTheme): void {
    if (!this.isBrowser || typeof document === 'undefined') return;

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');

    try {
      window.localStorage.setItem(this.storageKey, theme);
    } catch {
      // Ignore storage errors in restricted browser contexts.
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
