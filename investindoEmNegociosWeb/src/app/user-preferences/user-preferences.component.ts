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

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService.getPreferences().subscribe((prefs) => {
      this.moedaSelecionada = prefs.currency || 'BRL';
      if (prefs.locales?.length) {
        this.localizacoes = prefs.locales;
        this.linguaSelecionada = prefs.locales[0];
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
      locales
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

  private normalizeLocale(value: string): string {
    const raw = value.trim();
    if (!raw) return '';
    const match = raw.match(/[a-z]{2}[-_][A-Z]{2}/);
    if (match) return match[0].replace('_', '-');
    return raw;
  }
}
