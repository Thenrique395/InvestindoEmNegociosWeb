import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, Preferences } from '../profile.service';
import { getInitialLocale, persistLocaleSettings, setLocaleSettings } from '../utils/locale-settings';

@Component({
  selector: 'app-user-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-preferences.component.html',
  styleUrls: ['./user-preferences.component.scss']
})
export class UserPreferencesComponent implements OnInit {
  moedas = ['BRL', 'USD', 'EUR'];
  moedaSelecionada = 'BRL';
  localizacoes: string[] = ['pt-BR'];
  novaLocalizacao = '';
  linguas = [
    { id: 'pt-BR', label: 'Português (Brasil)' },
    { id: 'en-US', label: 'English (US)' }
  ];
  linguaSelecionada = 'pt-BR';
  loading = false;
  notifyInApp = true;
  notifyEmail = false;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService.getPreferences().subscribe((prefs) => {
      this.moedaSelecionada = prefs.currency || 'BRL';
      if (prefs.locales?.length) {
        this.localizacoes = prefs.locales;
        this.linguaSelecionada = prefs.locales[0];
        this.ensurePrimaryLocale();
      }
      if (prefs.notifications) {
        this.notifyInApp = prefs.notifications.inAppEnabled;
        this.notifyEmail = prefs.notifications.emailEnabled;
      }
    });
  }

  salvarPreferencias(): void {
    const previousLocale = getInitialLocale();
    const locales = this.localizacoes.length
      ? [this.linguaSelecionada, ...this.localizacoes.filter((l) => l !== this.linguaSelecionada)]
      : [this.linguaSelecionada];
    const payload: Preferences = {
      currency: this.moedaSelecionada,
      locales,
      notifications: {
        inAppEnabled: this.notifyInApp,
        emailEnabled: this.notifyEmail
      }
    };
    this.loading = true;
    this.profileService.updatePreferences(payload).subscribe({
      next: (resp) => {
        const locale = resp.locales[0] || 'pt-BR';
        const currency = resp.currency || 'BRL';
        document.documentElement.lang = locale;
        setLocaleSettings({ locale, currency });
        persistLocaleSettings(locale, currency);
        this.loading = false;
        alert('Preferências salvas.');
        if (locale !== previousLocale) {
          window.location.reload();
        }
      },
      error: () => {
        this.loading = false;
        alert('Falha ao salvar preferências.');
      }
    });
  }

  adicionarLocalizacao(): void {
    const loc = this.normalizeLocale(this.novaLocalizacao);
    if (!loc) return;
    if (!this.localizacoes.includes(loc)) {
      this.localizacoes.push(loc);
    }
    this.novaLocalizacao = '';
  }

  removerLocalizacao(index: number): void {
    this.localizacoes.splice(index, 1);
  }

  onLanguageChange(value: string): void {
    this.linguaSelecionada = value;
    this.ensurePrimaryLocale();
  }

  applyPreset(locale: string, currency: string): void {
    this.linguaSelecionada = locale;
    this.moedaSelecionada = currency;
    this.localizacoes = [locale];
  }

  get previewDate(): string {
    const locale = this.linguaSelecionada;
    const sample = new Date(2026, 0, 24);
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(sample);
  }

  get previewNumber(): string {
    const locale = this.linguaSelecionada;
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(12345.67);
  }

  get previewCurrency(): string {
    const locale = this.linguaSelecionada;
    const currency = this.moedaSelecionada || 'BRL';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(12345.67);
  }

  private normalizeLocale(value: string): string {
    const raw = value.trim();
    if (!raw) return '';
    const match = raw.match(/[a-z]{2}[-_][A-Z]{2}/);
    if (match) return match[0].replace('_', '-');
    return raw;
  }

  private ensurePrimaryLocale(): void {
    if (!this.linguaSelecionada) return;
    if (!this.localizacoes.includes(this.linguaSelecionada)) {
      this.localizacoes.unshift(this.linguaSelecionada);
    }
  }
}
