import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, Signal, computed, effect } from '@angular/core';
import { cardRemovalBlockMessage } from '../../shared/transactions/card-expense-notice';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiDataService, StoredCard, StoredExpense } from '../../core/data/api-data.service';
import { CartoesListagemComponent } from './cartoes-listagem.component';
import { CartaoFormComponent } from '../shared/cartao-form/cartao-form.component';
import { CardBrandLookup } from '../../core/lookups.service';
import { LookupsStore } from '../../core/lookups.store';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { CardDto, CardStatementCycleDto } from '../../core/cards.service';
import { CardsStore } from '../../core/cards.store';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { UiStateComponent } from '../../shared/ui-state/ui-state.component';
import { AppCurrencyPipe } from '../../shared/app-currency.pipe';
import { TransactionSummaryCardComponent } from '../../shared/transactions/transaction-summary-card.component';
import { PeriodHeroComponent } from '../../shared/period-hero/period-hero.component';
import { PeriodTotalCardComponent } from '../../shared/period-total-card/period-total-card.component';
import { UiPermissionsService } from '../../core/ui-permissions.service';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { SelectMenuComponent, SelectMenuOption } from '../../shared/select-menu/select-menu.component';
import { installmentStatusTone, InstallmentStatusTone } from '../../core/utils/status';
import { ConfirmSheetComponent } from '../../shared/confirm-sheet/confirm-sheet.component';
import { OnboardingReturnBannerComponent } from '../../shared/onboarding-return/onboarding-return-banner.component';
import {
  buildCardMetrics,
  overviewFromMetrics,
  CardMetrics,
  CardsOverview,
  statementStatusFor,
  StatementStatus
} from '../../core/card-metrics.model';

@Component({
  selector: 'app-cartoes',
  standalone: true,
  imports: [
    FormsModule,
    OnboardingReturnBannerComponent,
    DatePipe,
    DecimalPipe,
    CartoesListagemComponent,
    CartaoFormComponent,
    EmptyStateComponent,
    UiStateComponent,
    AppCurrencyPipe,
    TransactionSummaryCardComponent,
    PeriodHeroComponent,
    PeriodTotalCardComponent,
    StatusBadgeComponent,
    FilterBarComponent,
    SelectMenuComponent,
    ConfirmSheetComponent,
],
  templateUrl: './cartoes.component.html',
  styleUrls: ['./cartoes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartoesComponent implements OnInit {
  /** Cartões derivados reativamente do CardsStore (signal) — o template lê cards() e o OnPush re-renderiza sozinho quando os dados chegam. */
  readonly cards: Signal<StoredCard[]>;
  expenses: StoredExpense[] = [];
  /** Bandeiras ativas: a listagem usa para exibir o nome/ícone de cada cartão. */
  brands: CardBrandLookup[] = [];
  mostrarModal = false;
  /** Cartão passado ao formulário: `null` abre o modal em modo cadastro. */
  cartaoEmEdicao: StoredCard | null = null;
  private alertaTimeout?: ReturnType<typeof setTimeout>;
  statementCardId: string | null = null;
  statementYear = new Date().getFullYear();
  statementMonth: number | null = null;
  statementLoading = false;
  statementCycles: CardStatementCycleDto[] = [];
  private autoLoadedStatementCardId: string | null = null;

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

  get statementCardOptions(): SelectMenuOption[] {
    return this.cards().map((card) => ({
      value: card.id,
      label: `${card.nome} •••• ${this.finalCartao(card.numero)}`,
    }));
  }

  get statementMonthValue(): string {
    return this.statementMonth == null ? '' : String(this.statementMonth);
  }

  get statementMonthOptions(): SelectMenuOption[] {
    return [
      { value: '', label: 'Todos' },
      ...Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        return { value: String(month), label: this.statementMonthLabel(month) };
      }),
    ];
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

  onStatementMonthChange(value: string): void {
    this.statementMonth = value ? Number(value) : null;
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
      this.brands = this.lookupsStore.cardBrands().filter((b) => b.isActive !== false);
      this.cdr.markForCheck();
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

  abrirModal(): void {
    this.cartaoEmEdicao = null;
    this.mostrarModal = true;
  }

  editar(card: StoredCard): void {
    this.cartaoEmEdicao = card;
    this.mostrarModal = true;
  }

  fecharModal(): void {
    this.mostrarModal = false;
    this.cartaoEmEdicao = null;
  }

  /* O CardsStore já recarrega a lista ao salvar; aqui só encerramos o modal. */
  onCartaoSalvo(): void {
    this.fecharModal();
  }

  remover(id: string): void {
    // A recusa precisa dizer ONDE estão as despesas: uma compra no cartão cai na
    // competência da fatura, que pode ser um mês à frente do que está aberto —
    // "existem despesas vinculadas a ele" mandava procurar no escuro.
    const vinculadas = this.expenses.filter((e) => e.cartao === id);
    if (vinculadas.length) {
      this.uiFeedback.error(cardRemovalBlockMessage(vinculadas));
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

  finalCartao(numero: string): string {
    const digits = (numero || '').replace(/\D/g, '').slice(-4);
    return digits.padStart(4, '•');
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
