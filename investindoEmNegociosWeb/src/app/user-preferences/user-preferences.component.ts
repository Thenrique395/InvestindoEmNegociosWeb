import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, Preferences } from '../profile.service';

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
  localizacoes: string[] = ['Brasil (pt-BR)'];
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
    const payload: Preferences = {
      currency: this.moedaSelecionada,
      locales: this.localizacoes.length ? this.localizacoes : [this.linguaSelecionada]
    };
    this.loading = true;
    this.profileService.updatePreferences(payload).subscribe({
      next: (resp) => {
        localStorage.setItem('currency', resp.currency);
        localStorage.setItem('locales', resp.locales.join(';'));
        localStorage.setItem('lang', resp.locales[0] || this.linguaSelecionada);
        document.documentElement.lang = resp.locales[0] || 'pt-BR';
        this.loading = false;
        alert('Preferências salvas.');
      },
      error: () => {
        this.loading = false;
        alert('Falha ao salvar preferências.');
      }
    });
  }

  adicionarLocalizacao(): void {
    const loc = this.novaLocalizacao.trim();
    if (!loc) return;
    this.localizacoes.push(loc);
    this.novaLocalizacao = '';
  }

  removerLocalizacao(index: number): void {
    this.localizacoes.splice(index, 1);
  }
}
