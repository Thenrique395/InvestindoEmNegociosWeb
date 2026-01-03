import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe, NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredCard, StoredExpense } from '../data/api-data.service';
import { CartoesListagemComponent } from './cartoes-listagem.component';
import { LookupsService, CardBrandLookup } from '../lookups.service';

@Component({
  selector: 'app-cartoes',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, CartoesListagemComponent],
  templateUrl: './cartoes.component.html',
  styleUrls: ['./cartoes.component.scss']
})
export class CartoesComponent implements OnInit, OnDestroy {
  bandeira: string = '';
  numero = '';
  nome = '';
  mostrarNumero = false;
  cards: StoredCard[] = [];
  expenses: StoredExpense[] = [];
  mostrarModal = false;
  editandoId: string | null = null;
  alerta = '';
  brands: CardBrandLookup[] = [];

  get bandeiraCode(): string {
    const current = this.brands.find((b) => String(b.id) === String(this.bandeira));
    return (current?.code || '').toLowerCase();
  }
  get bandeiraNome(): string {
    const current = this.brands.find((b) => String(b.id) === String(this.bandeira));
    return current?.name || '';
  }
  private sub?: Subscription;
  private expensesSub?: Subscription;

  constructor(private db: ApiDataService, private lookups: LookupsService) {}

  ngOnInit(): void {
    this.sub = this.db.cards$.subscribe((lista) => {
      const user = this.currentUser;
      this.cards = lista.filter((c) => (c.userId ? c.userId === user : true));
    });
    this.expensesSub = this.db.expenses$.subscribe((lista) => {
      this.expenses = lista;
    });
    this.lookups.cardBrands().subscribe({
      next: (brands) => {
        const list = Array.isArray(brands) ? brands : [];
        const active = list.filter((b) => b.isActive !== false);
        this.brands = active;
        console.log('Bandeiras carregadas:', this.brands);
        this.bandeira = this.brands.length ? String(this.brands[0].id) : '';
      },
      error: () => {
        this.brands = [];
        this.alerta = 'Falha ao carregar bandeiras.';
        setTimeout(() => (this.alerta = ''), 4000);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.expensesSub?.unsubscribe();
  }

  get numeroFormatado(): string {
    const digits = this.numero.replace(/\D/g, '');
    return this.formatarNumeroParaDisplay(digits);
  }

  salvar(): void {
    if (!this.numero || !this.nome || !this.bandeira) return;
    const numeroLimpo = this.numero.replace(/\D/g, '').slice(-4);
    const payload = {
      bandeira: this.bandeira,
      numero: numeroLimpo,
      nome: this.nome,
      userId: this.currentUser
    };

    if (this.editandoId) {
      this.db.updateCard(this.editandoId, payload);
    } else {
      this.db.addCard(payload);
    }

    this.fecharModal();
    this.numero = '';
    this.nome = '';
    this.bandeira = this.brands[0]?.id ? String(this.brands[0].id) : '';
    this.editandoId = null;
  }

  abrirModal(): void {
    if (!this.bandeira && this.brands.length) {
      this.bandeira = this.brands[0].id.toString();
    }
    this.mostrarModal = true;
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.mostrarNumero = false;
    this.editandoId = null;
    this.bandeira = this.brands[0]?.id ? String(this.brands[0].id) : '';
    this.numero = '';
    this.nome = '';
  }

  remover(id: string): void {
    const possuiDespesa = this.expenses.some((e) => e.cartao === id);
    if (possuiDespesa) {
      this.alerta = 'Não é possível remover este cartão; existem despesas vinculadas a ele.';
      setTimeout(() => (this.alerta = ''), 4000);
      return;
    }
    this.db.removeCard(id);
  }

  onNumeroInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const raw = target?.value ?? '';
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    const formatted = this.formatarNumeroEntrada(digits);
    this.numero = formatted;
    if (target) target.value = formatted;
  }

  editar(card: StoredCard): void {
    this.editandoId = card.id;
    this.mostrarModal = true;
    this.bandeira = card.bandeira;
    this.numero = this.formatarNumeroEntrada(card.numero.replace(/\D/g, ''));
    this.nome = card.nome;
  }

  toggleNumero(): void {
    this.mostrarNumero = !this.mostrarNumero;
  }

  private formatarNumeroParaDisplay(numero: string): string {
    const digits = numero.replace(/\D/g, '').slice(-4);
    return `•••• ${digits.padStart(4, '•')}`;
  }

  private formatarNumeroEntrada(digits: string): string {
    return digits.match(/.{1,4}/g)?.join(' ') || digits;
  }

  private get currentUser(): string {
    if (typeof localStorage === 'undefined') return 'guest';
    return localStorage.getItem('current_user') || 'guest';
  }

  tituloBandeira(id: string): string {
    const brand = this.brands.find((b) => String(b.id) === id);
    return brand?.name || 'Cartão';
  }
}
