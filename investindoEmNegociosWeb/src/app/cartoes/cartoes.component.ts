import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, Signal, computed, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe, DatePipe, DecimalPipe } from '@angular/common';
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
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { UiStateComponent } from '../ui-state/ui-state.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { PeriodHeroComponent } from '../shared/period-hero/period-hero.component';
import { PeriodTotalCardComponent } from '../shared/period-total-card/period-total-card.component';
import { UiPermissionsService } from '../ui-permissions.service';
import { ModalComponent } from '../shared/modal/modal.component';
import { FormFieldComponent } from '../shared/form-field/form-field.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { FilterBarComponent } from '../shared/filter-bar/filter-bar.component';
import { installmentStatusTone, InstallmentStatusTone } from '../utils/status';
import { ConfirmSheetComponent } from '../shared/confirm-sheet/confirm-sheet.component';
import {
  buildCardMetrics,
  overviewFromMetrics,
  CardMetrics,
  CardsOverview,
  statementStatusFor,
  StatementStatus
} from './card-metrics.model';

type CardFormField = 'brand' | 'number' | 'name' | 'limit' | 'closingDay' | 'dueDay';

@Component({
  selector: 'app-cartoes',
  standalone: true,
  imports: [
    FormsModule,
    UpperCasePipe,
    DatePipe,
    DecimalPipe,
    CartoesListagemComponent,
    DigitOnlyDirective,
    EmptyStateComponent,
    UiStateComponent,
    AppCurrencyPipe,
    TransactionSummaryCardComponent,
    PeriodHeroComponent,
    PeriodTotalCardComponent,
    ModalComponent,
    FormFieldComponent,
    StatusBadgeComponent,
    FilterBarComponent,
    ConfirmSheetComponent,
],
  templateUrl: './cartoes.component.html',
  styleUrls: ['./cartoes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartoesComponent implements OnInit {
  bandeira: string = '';
  numero = '';
  nome = '';
  apelido = '';
  banco = '';
  limiteCredito = 0;
  limiteCreditoInput = '';
  diaFechamento = 1;
  diaVencimento = 1;
  saving = false;
  mostrarNumero = false;
  /** Cartões derivados reativamente do CardsStore (signal) — o template lê cards() e o OnPush re-renderiza sozinho quando os dados chegam. */
  readonly cards: Signal<StoredCard[]>;
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
    return this.cards().length;
  }

  get totalLimit(): number {
    return this.cards().reduce((sum, card) => sum + (card.limiteCredito || 0), 0);
  }

  get nextClosingDay(): number | null {
    if (!this.cards().length) return null;
    return this.cards()
      .map((card) => Number(card.diaFechamento) || 31)
      .sort((a, b) => a - b)[0] ?? null;
  }

  get nextDueDay(): number | null {
    if (!this.cards().length || this.nextClosingDay == null) return null;
    const sameDayCard = this.cards().find((card) => Number(card.diaFechamento) === this.nextClosingDay);
    return sameDayCard ? Number(sameDayCard.diaVencimento) || null : null;
  }

  get nextClosingNote(): string {
    return this.nextDueDay
      ? `Vencimento associado no dia ${this.nextDueDay}.`
      : 'Cadastre um cartão para acompanhar ciclo de fechamento e vencimento.';
  }

  get canViewCardStatements(): boolean {
    return this.uiPermissions.canViewCardStatements();
  }

  get totalOpenStatements(): number {
    return this.statementCycles.reduce((sum, cycle) => sum + (cycle.totalOpen || 0), 0);
  }

  cartaoParaRemover: string | null = null;

  private metricsCacheCards?: StoredCard[];
  private metricsCacheExpenses?: StoredExpense[];
  private metricsCacheValue: CardMetrics[] = [];

  /** Calcula as métricas uma vez por combinação (cards, expenses); reusadas por lista e resumo. */
  private computeCardMetrics(): CardMetrics[] {
    const cards = this.cards();
    if (this.metricsCacheCards === cards && this.metricsCacheExpenses === this.expenses) {
      return this.metricsCacheValue;
    }
    this.metricsCacheValue = cards.map((card) => buildCardMetrics(card, this.expenses, new Date()));
    this.metricsCacheCards = cards;
    this.metricsCacheExpenses = this.expenses;
    return this.metricsCacheValue;
  }

  get cardMetrics(): CardMetrics[] {
    return this.computeCardMetrics();
  }

  get cardsOverview(): CardsOverview {
    return overviewFromMetrics(this.computeCardMetrics());
  }

  statementStatus(cycle: CardStatementCycleDto): StatementStatus {
    return statementStatusFor(cycle, new Date());
  }

  statementStatusLabel(status: StatementStatus): string {
    switch (status) {
      case 'paid':
        return 'Paga';
      case 'overdue':
        return 'Atrasada';
      case 'closed':
        return 'Fechada';
      default:
        return 'Aberta';
    }
  }

  statementStatusTone(status: StatementStatus): 'success' | 'danger' | 'warning' | 'info' {
    switch (status) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'danger';
      case 'closed':
        return 'warning';
      default:
        return 'info';
    }
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
  constructor(
    private db: ApiDataService,
    private lookupsStore: LookupsStore,
    private cardsStore: CardsStore,
    private uiFeedback: UiFeedbackService,
    private uiPermissions: UiPermissionsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {
    this.cards = computed(() => this.cardsStore.cards().map((card) => this.mapCardDto(card)));

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
      const mappedCards = this.cards();
      const selectedId = this.cardsStore.selectedCardId();
      const nextStatementCardId = selectedId || mappedCards[0]?.id || null;
      const statementCardChanged = this.statementCardId !== nextStatementCardId;
      const loadedStatementCardId = this.cardsStore.statementsCardId();
      const statementsLoading = this.cardsStore.statementsLoading();
      this.statementCardId = nextStatementCardId;
      this.cdr.markForCheck();

      if (!mappedCards.length) {
        this.statementCycles = [];
        this.autoLoadedStatementCardId = null;
        return;
      }

      if (
        this.canViewCardStatements &&
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
      this.cdr.markForCheck();
    });

  }

  ngOnInit(): void {
    this.db.expenses$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.expenses = lista;
      this.cdr.markForCheck();
    });
    this.lookupsStore.loadCardBrands();
    this.lookupsStore.loadInstitutions('Bank');
    this.cardsStore.load(undefined, true);
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
      nickname: this.apelido.trim() || undefined,
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
    this.limiteCreditoInput = formatCurrencyValue(this.limiteCredito);
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
    this.apelido = '';
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
    this.cartaoParaRemover = id;
  }

  get cartaoParaRemoverNome(): string {
    return this.cards().find((c) => c.id === this.cartaoParaRemover)?.nome || 'este cartão';
  }

  confirmarRemocao(): void {
    const id = this.cartaoParaRemover;
    this.cartaoParaRemover = null;
    if (!id) return;
    this.cardsStore.delete(
      id,
      () => this.setAlerta('Cartão removido com sucesso.', 2500, 'success'),
      () => this.uiFeedback.error('Falha ao remover cartão.')
    );
  }

  cancelarRemocao(): void {
    this.cartaoParaRemover = null;
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
    this.nome = card.holderName || card.nome;
    this.apelido = card.nome !== (card.holderName || card.nome) ? card.nome : '';
    this.banco = card.banco || '';
    this.limiteCredito = card.limiteCredito ?? 0;
    this.limiteCreditoInput = formatCurrencyValue(this.limiteCredito);
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

    // Em edição, a API só devolve o last4 (o PAN completo nunca retorna por segurança),
    // então o campo carrega apenas 4 dígitos. Não exigimos o número completo nesse caso,
    // mas se o usuário digitar um número novo, ele é validado normalmente (13-19 dígitos).
    const numeroInalteradoNaEdicao = !!this.editandoId && digits.length <= 4;
    if (!digits) {
      errors.number = 'Informe o número do cartão.';
    } else if (!numeroInalteradoNaEdicao && (digits.length < 13 || digits.length > 19)) {
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
    this.limiteCreditoInput = formatCurrencyValue(this.limiteCredito);
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

  tituloBandeira(id: string): string {
    const brand = this.brands.find((b) => String(b.id) === id);
    return brand?.name || 'Cartão';
  }

  loadStatementCycles(): void {
    if (!this.canViewCardStatements) return;

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

  cardExpenseStatusTone(expense: StoredExpense): InstallmentStatusTone {
    return installmentStatusTone(expense.status);
  }

  trackByStatement(index: number, _item?: unknown): number {
    return index;
  }
  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

  private mapCardDto(card: CardDto): StoredCard {
    return {
      id: card.id,
      bandeira: String(card.brandId),
      numero: card.last4,
      nome: card.nickname || card.holderName,
      holderName: card.holderName,
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
