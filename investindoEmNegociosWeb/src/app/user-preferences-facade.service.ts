import { Injectable, inject } from '@angular/core';
import { ProfileService } from './profile.service';
import { getInitialCurrency, getInitialLocale, persistLocaleSettings, setLocaleSettings } from './utils/locale-settings';

@Injectable({ providedIn: 'root' })
export class UserPreferencesFacadeService {
  private readonly profileService = inject(ProfileService);

  initFromStorage(): void {
    const locale = getInitialLocale();
    const currency = getInitialCurrency();
    this.applySettings(locale, currency, false);
  }

  loadRemotePreferences(): void {
    this.profileService.getPreferences().subscribe({
      next: (prefs) => {
        const locale = prefs.locales?.[0] || 'pt-BR';
        const currency = prefs.currency || 'BRL';
        this.applySettings(locale, currency, true);
      },
      error: () => {
        /* ignore */
      }
    });
  }

  private applySettings(locale: string, currency: string, persist: boolean): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
    setLocaleSettings({ locale, currency });
    if (persist) {
      persistLocaleSettings(locale, currency);
    }
  }
}
