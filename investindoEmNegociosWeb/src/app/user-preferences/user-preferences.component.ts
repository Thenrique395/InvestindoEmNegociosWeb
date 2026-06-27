import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ProfileService, Preferences } from '../profile.service';
import { getInitialLocale, persistLocaleSettings, setLocaleSettings, SUPPORTED_CURRENCIES } from '../utils/locale-settings';
import { extractApiErrorMessage } from '../utils/api-error.utils';
import { UiFeedbackService } from '../ui-feedback.service';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-preferences',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-preferences.component.html',
  styleUrls: ['./user-preferences.component.scss']
})
export class UserPreferencesComponent implements OnInit {
  moedas: readonly string[] = SUPPORTED_CURRENCIES;
  moedaSelecionada = 'BRL';
  localizacoes: string[] = ['pt-BR'];
  novaLocalizacao = '';
  linguas = [
    { id: 'pt-BR', label: 'Português (Brasil)' },
    { id: 'en-US', label: 'English (US)' }
  ];
  linguaSelecionada = 'pt-BR';
  loading = false;
  deletingAccount = false;
  notifyInApp = true;
  notifyEmail = false;
  notifyUpcoming = true;
  notifyOverdue = true;
  notifyDaysBeforeDue = 3;
  deletePassword = '';
  deleteConfirmation = '';

  constructor(
    private profileService: ProfileService,
    private uiFeedback: UiFeedbackService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.profileService.getPreferences().subscribe((prefs) => {
      this.moedaSelecionada = prefs.currency || 'BRL';
      if (prefs.locales?.length) {
        this.localizacoes = prefs.locales;
        this.linguaSelecionada = prefs.locales[0];
        this.ensurePrimaryLocale();
      }
      if (prefs.notifications) {
        this.notifyUpcoming = prefs.notifications.upcomingEnabled;
        this.notifyOverdue = prefs.notifications.overdueEnabled;
        this.notifyInApp = prefs.notifications.inAppEnabled;
        this.notifyEmail = prefs.notifications.emailEnabled;
        this.notifyDaysBeforeDue = prefs.notifications.daysBeforeDue;
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
        upcomingEnabled: this.notifyUpcoming,
        overdueEnabled: this.notifyOverdue,
        inAppEnabled: this.notifyInApp,
        emailEnabled: this.notifyEmail,
        daysBeforeDue: Math.max(0, Math.min(60, Number(this.notifyDaysBeforeDue) || 0))
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
        this.uiFeedback.success('Preferências salvas.');
        if (locale !== previousLocale) {
          setTimeout(() => window.location.reload(), 700);
        }
      },
      error: () => {
        this.loading = false;
        this.uiFeedback.error('Falha ao salvar preferências.');
      }
    });
  }

  excluirConta(): void {
    const password = this.deletePassword.trim();
    const confirmationText = this.deleteConfirmation.trim().toUpperCase();

    if (!password) {
      this.uiFeedback.warning('Informe sua senha atual para excluir a conta.');
      return;
    }

    if (confirmationText !== 'EXCLUIR') {
      this.uiFeedback.warning('Digite EXCLUIR para confirmar a exclusão da conta.');
      return;
    }

    this.deletingAccount = true;
    this.profileService.deleteOwnAccount({ currentPassword: password, confirmationText }).subscribe({
      next: () => {
        this.deletingAccount = false;
        this.authService.clearSession();
        this.uiFeedback.success('Conta excluída com sucesso.');
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.deletingAccount = false;
        const message = extractApiErrorMessage(err, 'Não foi possível excluir a conta.');
        this.uiFeedback.error(message);
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
  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

}
