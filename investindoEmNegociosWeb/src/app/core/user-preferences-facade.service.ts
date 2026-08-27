import { Injectable, inject } from '@angular/core';
import { ProfileService } from './profile.service';
import { ThemeService } from './theme.service';
import { getInitialCurrency, getInitialLocale, persistLocaleSettings, setLocaleSettings } from './utils/locale-settings';

@Injectable({ providedIn: 'root' })
export class UserPreferencesFacadeService {
  private readonly profileService = inject(ProfileService);
  private readonly themeService = inject(ThemeService);

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
        // Tema salvo no servidor manda ao logar (segue o usuário entre dispositivos).
        if (prefs.theme === 'light' || prefs.theme === 'dark') {
          this.themeService.set(prefs.theme);
        }
      },
      error: () => {
        /* ignore */
      }
    });
  }

  // Persiste a escolha de tema no servidor (silencioso — o localStorage já cuidou da UX).
  saveTheme(theme: 'light' | 'dark'): void {
    this.profileService.updateTheme(theme).subscribe({ error: () => { /* ignore */ } });
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
