import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe, NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, NgClass } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredCard, StoredExpense } from '../data/api-data.service';
import { CartoesListagemComponent } from './cartoes-listagem.component';
import { LookupsService, CardBrandLookup } from '../lookups.service';
import { DigitOnlyDirective } from '../utils/digit-only.directive';
import { formatCurrencyValue } from '../utils/locale-utils';

@Component({
  selector: 'app-cartoes',
  standalone: true,
  imports: [
    FormsModule,
    UpperCasePipe,
    NgIf,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    CartoesListagemComponent,
    NgClass,
    DigitOnlyDirective
  ],
  templateUrl: './cartoes.component.html',
  styleUrls: ['./cartoes.component.scss']
})
export class CartoesComponent implements OnInit, OnDestroy {
  bandeira: string = '';
  numero = '';
  nome = '';
  banco = '';
  limiteCredito = 0;
  limiteCreditoInput = '';
  diaFechamento = 1;
  diaVencimento = 1;
  saving = false;
  mostrarNumero = false;
  cards: StoredCard[] = [];
  expenses: StoredExpense[] = [];
  mostrarModal = false;
  editandoId: string | null = null;
  alerta = '';
  alertaTipo: 'info' | 'success' | 'error' = 'info';
  private alertaTimeout?: ReturnType<typeof setTimeout>;
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
      this.cards = lista;
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
        this.alertaTipo = 'error';
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
    if (this.saving) return;
    if (!this.numero || !this.nome || !this.bandeira) return;
    if (this.diaFechamento < 1 || this.diaFechamento > 31) return;
    if (this.diaVencimento < 1 || this.diaVencimento > 31) return;
    if (this.limiteCredito < 0) return;
    this.saving = true;
    let ok = false;
    const numeroLimpo = this.numero.replace(/\D/g, '').slice(-4);
    const payload = {
      bandeira: this.bandeira,
      numero: numeroLimpo,
      nome: this.nome,
      banco: this.banco,
      limiteCredito: this.limiteCredito,
      diaFechamento: this.diaFechamento,
      diaVencimento: this.diaVencimento
    };

    if (this.editandoId) {
      this.db.updateCard(this.editandoId, payload);
    } else {
      this.db.addCard(payload);
    }

    ok = true;
    this.saving = false;
    if (ok) {
      this.setAlerta('Cartão salvo com sucesso.', 2500, 'success');
      this.fecharModal();
    }
  }

  abrirModal(): void {
    if (!this.bandeira && this.brands.length) {
      this.bandeira = this.brands[0].id.toString();
    }
    this.limiteCreditoInput = this.formatCurrency(this.limiteCredito);
    this.mostrarModal = true;
  }

  fecharModal(): void {
    if (this.saving) return;
    this.mostrarModal = false;
    this.mostrarNumero = false;
    this.editandoId = null;
    this.bandeira = this.brands[0]?.id ? String(this.brands[0].id) : '';
    this.numero = '';
    this.nome = '';
    this.banco = '';
    this.limiteCredito = 0;
    this.limiteCreditoInput = '';
    this.diaFechamento = 1;
    this.diaVencimento = 1;
  }

  remover(id: string): void {
    const possuiDespesa = this.expenses.some((e) => e.cartao === id);
    if (possuiDespesa) {
      this.alerta = 'Não é possível remover este cartão; existem despesas vinculadas a ele.';
      this.alertaTipo = 'error';
      setTimeout(() => (this.alerta = ''), 4000);
      return;
    }
    this.db.removeCard(id);
  }

  private setAlerta(msg: string, duracao = 3000, tipo: 'info' | 'success' | 'error' = 'info'): void {
    this.alerta = msg;
    this.alertaTipo = tipo;
    if (this.alertaTimeout) clearTimeout(this.alertaTimeout);
    this.alertaTimeout = setTimeout(() => (this.alerta = ''), duracao);
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
    this.banco = card.banco || '';
    this.limiteCredito = card.limiteCredito ?? 0;
    this.limiteCreditoInput = this.formatCurrency(this.limiteCredito);
    this.diaFechamento = card.diaFechamento ?? 1;
    this.diaVencimento = card.diaVencimento ?? 1;
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

  onLimiteChange(value: string): void {
    const digits = (value || '').replace(/[^\d]/g, '');
    const number = Number(digits) / 100;
    this.limiteCredito = Number.isFinite(number) ? number : 0;
    this.limiteCreditoInput = this.formatCurrency(this.limiteCredito);
  }

  onDiaChange(value: string, field: 'fechamento' | 'vencimento'): void {
    const digits = (value || '').replace(/[^\d]/g, '');
    let day = Number(digits || '0');
    if (!Number.isFinite(day)) day = 1;
    if (day < 1) day = 1;
    if (day > 31) day = 31;

    if (field === 'fechamento') {
      this.diaFechamento = day;
    } else {
      this.diaVencimento = day;
    }
  }

  onDiaInput(event: Event, field: 'fechamento' | 'vencimento'): void {
    const target = event.target as HTMLInputElement | null;
    const raw = target?.value ?? '';
    const digits = raw.replace(/[^\d]/g, '').slice(0, 2);
    const day = Number(digits || '1');
    const clamped = Math.min(31, Math.max(1, Number.isFinite(day) ? day : 1));

    if (target) {
      target.value = digits;
    }

    if (field === 'fechamento') {
      this.diaFechamento = clamped;
    } else {
      this.diaVencimento = clamped;
    }
  }

  private formatCurrency(value: number): string {
    return formatCurrencyValue(value);
  }

  tituloBandeira(id: string): string {
    const brand = this.brands.find((b) => String(b.id) === id);
    return brand?.name || 'Cartão';
  }
}
