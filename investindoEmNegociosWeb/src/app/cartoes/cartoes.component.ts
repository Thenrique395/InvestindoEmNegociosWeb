import { Component, OnDestroy, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe, DatePipe, DecimalPipe, NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredCard, StoredExpense } from '../data/api-data.service';
import { CartoesListagemComponent } from './cartoes-listagem.component';
import { CardBrandLookup, InstitutionLookup } from '../lookups.service';
import { LookupsStore } from '../lookups.store';
import { DigitOnlyDirective } from '../utils/digit-only.directive';
import { formatCurrencyValue } from '../utils/locale-utils';
import { UiFeedbackService } from '../ui-feedback.service';
import { CardDto, CardPayload, CardStatementCycleDto } from '../cards.service';
import { CardsStore } from '../cards.store';
import { FormState } from '../utils/form-state';

type CardFormField = 'brand' | 'number' | 'name' | 'limit' | 'closingDay' | 'dueDay';

@Component({
  selector: 'app-cartoes',
  standalone: true,
  imports: [
    FormsModule,
    UpperCasePipe,
    DatePipe,
    DecimalPipe,
    NgIf,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    CartoesListagemComponent,
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
  institutions: InstitutionLookup[] = [];
  mostrarModal = false;
  editandoId: string | null = null;
  private alertaTimeout?: ReturnType<typeof setTimeout>;
  brands: CardBrandLookup[] = [];
  statementCardId: string | null = null;
  statementYear = new Date().getFullYear();
  statementMonth: number | null = null;
  statementLoading = false;
  statementCycles: CardStatementCycleDto[] = [];
  private autoLoadedStatementCardId: string | null = null;

  readonly cardForm = new FormState<CardFormField>(
    ['brand', 'number', 'name', 'limit', 'closingDay', 'dueDay'],
    () => this.validateCardForm()
  );

  get totalCards(): number {
    return this.cards.length;
  }

  get totalLimit(): number {
    return this.cards.reduce((sum, card) => sum + (card.limiteCredito || 0), 0);
  }

  get nextClosingDay(): number | null {
    if (!this.cards.length) return null;
    return this.cards
      .map((card) => Number(card.diaFechamento) || 31)
      .sort((a, b) => a - b)[0] ?? null;
  }

  get nextDueDay(): number | null {
    if (!this.cards.length || this.nextClosingDay == null) return null;
    const sameDayCard = this.cards.find((card) => Number(card.diaFechamento) === this.nextClosingDay);
    return sameDayCard ? Number(sameDayCard.diaVencimento) || null : null;
  }

  get totalOpenStatements(): number {
    return this.statementCycles.reduce((sum, cycle) => sum + (cycle.totalOpen || 0), 0);
  }

  get selectedCardExpenses(): StoredExpense[] {
    if (!this.statementCardId) return [];

    return this.expenses
      .filter((expense) => {
        if (expense.cartao !== this.statementCardId) return false;

        if (this.statementYear && expense.statementYear && expense.statementYear !== this.statementYear) {
          return false;
        }

        if (this.statementMonth && expense.statementMonth && expense.statementMonth !== this.statementMonth) {
          return false;
        }

        if ((!expense.statementYear || !expense.statementMonth) && this.statementYear) {
          const date = this.parseLocaleDate(expense.vencimento);
          if (!date || date.getFullYear() !== this.statementYear) return false;
          if (this.statementMonth && date.getMonth() + 1 !== this.statementMonth) return false;
        }

        return true;
      })
      .sort((a, b) => this.sortExpenseByDateDesc(a, b));
  }

  get bandeiraCode(): string {
    const current = this.brands.find((b) => String(b.id) === String(this.bandeira));
    return (current?.code || '').toLowerCase();
  }
  get bandeiraNome(): string {
    const current = this.brands.find((b) => String(b.id) === String(this.bandeira));
    return current?.name || '';
  }
  private expensesSub?: Subscription;

  constructor(
    private db: ApiDataService,
    private lookupsStore: LookupsStore,
    private cardsStore: CardsStore,
    private uiFeedback: UiFeedbackService
  ) {
    effect(() => {
      const activeBrands = this.lookupsStore.cardBrands().filter((b) => b.isActive !== false);
      this.brands = activeBrands;
      if (!this.bandeira && this.brands.length) {
        this.bandeira = String(this.brands[0].id);
      }
    });

    effect(() => {
      this.institutions = this.lookupsStore.institutions('Bank');
    });

    effect(() => {
      const mappedCards = this.cardsStore.cards().map((card) => this.mapCardDto(card));
      this.cards = mappedCards;
      const selectedId = this.cardsStore.selectedCardId();
      const nextStatementCardId = selectedId || mappedCards[0]?.id || null;
      const statementCardChanged = this.statementCardId !== nextStatementCardId;
      const loadedStatementCardId = this.cardsStore.statementsCardId();
      const statementsLoading = this.cardsStore.statementsLoading();
      this.statementCardId = nextStatementCardId;

      if (!mappedCards.length) {
        this.statementCycles = [];
        this.autoLoadedStatementCardId = null;
        return;
      }

      if (
        nextStatementCardId &&
        !statementsLoading &&
        (statementCardChanged || loadedStatementCardId !== nextStatementCardId) &&
        this.autoLoadedStatementCardId !== nextStatementCardId
      ) {
        this.autoLoadedStatementCardId = nextStatementCardId;
        queueMicrotask(() => {
          if (this.statementCardId === nextStatementCardId) {
            this.loadStatementCycles();
          }
        });
      }
    });

    effect(() => {
      this.statementCycles = this.cardsStore.statements();
      this.statementLoading = this.cardsStore.statementsLoading();
      const error = this.cardsStore.statementsError();
      if (error) {
        this.uiFeedback.error(error);
      }
    });
  }

  ngOnInit(): void {
    this.expensesSub = this.db.expenses$.subscribe((lista) => {
      this.expenses = lista;
    });
    this.lookupsStore.loadCardBrands();
    this.lookupsStore.loadInstitutions('Bank');
    this.cardsStore.load(undefined, true);
  }

  ngOnDestroy(): void {
    this.expensesSub?.unsubscribe();
  }

  get numeroFormatado(): string {
    const digits = this.numero.replace(/\D/g, '');
    return this.formatarNumeroParaDisplay(digits);
  }

  salvar(): void {
    if (this.saving) return;
    this.cardForm.submit();

    if (!this.cardForm.isValid()) {
      this.uiFeedback.warning('Revise os campos destacados antes de salvar.');
      return;
    }

    this.saving = true;

    const payload: CardPayload = {
      brandId: Number(this.bandeira),
      holderName: this.nome,
      nickname: this.nome,
      last4: this.numero.replace(/\D/g, '').slice(-4),
      bank: this.banco || null,
      creditLimit: this.limiteCredito,
      statementCloseDay: this.diaFechamento,
      dueDay: this.diaVencimento
    };

    const done = () => {
      this.setAlerta('Cartão salvo com sucesso.', 2500, 'success');
      this.saving = false;
      this.fecharModal();
    };

    const fail = (message: string, error?: { status?: number }) => {
      this.saving = false;
      if (error?.status === 409) {
        this.uiFeedback.warning(message);
        return;
      }
      this.uiFeedback.error(message);
    };

    if (this.editandoId) {
      this.cardsStore.update(this.editandoId, payload, done, fail);
      return;
    }

    this.cardsStore.create(payload, done, fail);
  }

  abrirModal(): void {
    if (!this.bandeira && this.brands.length) {
      this.bandeira = this.brands[0].id.toString();
    }
    this.cardForm.reset();
    this.limiteCreditoInput = this.formatCurrency(this.limiteCredito);
    this.mostrarModal = true;
  }

  fecharModal(): void {
    if (this.saving) return;
    this.mostrarModal = false;
    this.mostrarNumero = false;
    this.editandoId = null;
    this.cardForm.reset();
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
      this.uiFeedback.error('Não é possível remover este cartão; existem despesas vinculadas a ele.');
      return;
    }
    this.cardsStore.delete(id, () => this.setAlerta('Cartão removido com sucesso.', 2500, 'success'));
  }

  private setAlerta(msg: string, duracao = 3000, tipo: 'info' | 'success' | 'error' = 'info'): void {
    if (this.alertaTimeout) clearTimeout(this.alertaTimeout);
    if (tipo === 'success') this.uiFeedback.success(msg, duracao);
    if (tipo === 'error') this.uiFeedback.error(msg, duracao);
    if (tipo === 'info') this.uiFeedback.info(msg, duracao);
    this.alertaTimeout = setTimeout(() => {
      /* noop */
    }, duracao);
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
    this.cardForm.reset();
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

  private validateCardForm(): Partial<Record<CardFormField, string>> {
    const errors: Partial<Record<CardFormField, string>> = {};
    const digits = this.numero.replace(/\D/g, '');
    const name = this.nome.trim();

    if (!this.bandeira) {
      errors.brand = 'Selecione a bandeira do cartão.';
    }

    if (!digits) {
      errors.number = 'Informe o número do cartão.';
    } else if (digits.length < 13 || digits.length > 19) {
      errors.number = 'O número do cartão deve ter entre 13 e 19 dígitos.';
    }

    if (!name) {
      errors.name = 'Informe o nome impresso no cartão.';
    } else if (name.length < 2) {
      errors.name = 'O nome precisa ter pelo menos 2 caracteres.';
    }

    if (!Number.isFinite(this.limiteCredito) || this.limiteCredito < 0) {
      errors.limit = 'Informe um limite de crédito válido.';
    }

    if (!Number.isFinite(this.diaFechamento) || this.diaFechamento < 1 || this.diaFechamento > 31) {
      errors.closingDay = 'Informe um dia de fechamento entre 1 e 31.';
    }

    if (!Number.isFinite(this.diaVencimento) || this.diaVencimento < 1 || this.diaVencimento > 31) {
      errors.dueDay = 'Informe um dia de vencimento entre 1 e 31.';
    }

    return errors;
  }

  private formatarNumeroParaDisplay(numero: string): string {
    const digits = numero.replace(/\D/g, '').slice(-4);
    return `•••• ${digits.padStart(4, '•')}`;
  }

  private formatarNumeroEntrada(digits: string): string {
    return digits.match(/.{1,4}/g)?.join(' ') || digits;
  }

  finalCartao(numero: string): string {
    const digits = (numero || '').replace(/\D/g, '').slice(-4);
    return digits.padStart(4, '•');
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

  loadStatementCycles(): void {
    if (!this.statementCardId) {
      this.statementCycles = [];
      this.autoLoadedStatementCardId = null;
      this.cardsStore.selectCard(null);
      return;
    }

    this.autoLoadedStatementCardId = this.statementCardId;
    this.cardsStore.selectCard(this.statementCardId);
    this.cardsStore.loadStatements(this.statementCardId, {
      year: this.statementYear || undefined,
      month: this.statementMonth || undefined
    });
  }

  statementMonthLabel(month: number): string {
    return String(month).padStart(2, '0');
  }

  cardExpenseInstallmentLabel(expense: StoredExpense): string {
    if (expense.parcelasTotal && expense.parcelaNumero) {
      return `${expense.parcelaNumero}/${expense.parcelasTotal}`;
    }

    return '1/1';
  }

  cardExpenseStatusLabel(expense: StoredExpense): string {
    switch ((expense.status || '').toUpperCase()) {
      case 'PAID':
        return 'Paga';
      case 'ANTICIPATED':
        return 'Antecipada';
      default:
        return 'Pendente';
    }
  }

  trackByStatement(index: number): number {
    return index;
  }
  trackByIndex(index: number): number {
    return index;
  }

  private mapCardDto(card: CardDto): StoredCard {
    return {
      id: card.id,
      bandeira: String(card.brandId),
      numero: card.last4,
      nome: card.nickname || card.holderName,
      banco: card.bank ?? null,
      limiteCredito: card.creditLimit ?? 0,
      diaFechamento: card.statementCloseDay ?? 1,
      diaVencimento: card.dueDay ?? 1,
      userId: ''
    };
  }

  private parseLocaleDate(value: string): Date | null {
    const [day, month, year] = (value || '').split('/').map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private sortExpenseByDateDesc(a: StoredExpense, b: StoredExpense): number {
    const dateA = this.parseLocaleDate(a.vencimento)?.getTime() ?? 0;
    const dateB = this.parseLocaleDate(b.vencimento)?.getTime() ?? 0;
    return dateB - dateA;
  }

}
