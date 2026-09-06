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
import { SelectMenuComponent, SelectMenuOption } from '../../shared/select-menu/select-menu.component';
import { NumberStepperComponent } from '../../shared/number-stepper/number-stepper.component';
import { installmentStatusTone, InstallmentStatusTone } from '../../core/utils/status';
import { formatMonthLabel } from '../../core/utils/locale-utils';
import { ConfirmSheetComponent } from '../../shared/confirm-sheet/confirm-sheet.component';
import { OnboardingReturnBannerComponent } from '../layout/onboarding-return/onboarding-return-banner.component';
import {
  buildCardMetrics,
  overviewFromMetrics,
  CardMetrics,
  CardsOverview,
  statementStatusFor,
  StatementStatus
} from '../../core/card-metrics.model';

/** Linha da fatura: extrato da API + o que a despesa local sabe a mais. */
interface StatementItemView {
  id: string;
  titulo: string;
  categoria: string;
  parcela: string;
  statusLabel: string;
  statusTone: InstallmentStatusTone;
  valor: number;
  vencimento: string;
}

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
    SelectMenuComponent,
    NumberStepperComponent,
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
  /** Acordeão: só um ciclo aberto por vez, e seus itens já cruzados. */
  cicloAberto: string | null = null;
  faturaItens: StatementItemView[] = [];
  /** Só na primeira carga de cada consulta: depois quem manda é o usuário. */
  private autoAbrirCicloCorrente = true;
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
        return { value: String(month), label: formatMonthLabel(this.statementYear, index, 'long') };
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
      this.abrirCicloCorrente();
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
      this.recalcularFaturaAberta();
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

  /**
   * "Parcelas" do ciclo: quantos lançamentos são continuação de uma compra
   * anterior. A API devolve o total de itens, não este recorte — daí a conta
   * aqui, sobre os itens que já vêm no ciclo.
   */
  statementInstallmentsCount(cycle: CardStatementCycleDto): number {
    return cycle.items.filter((item) => item.installmentNo > 1).length;
  }

  /**
   * A tela abre com a fatura do mês corrente já expandida — é a que o usuário
   * veio ver. Filtrar a lista por esse mês seria o caminho curto, mas aí as
   * faturas anteriores somem, e é justamente nelas que se confere o que já foi
   * pago. Abrir uma sem esconder as outras resolve os dois lados.
   */
  private abrirCicloCorrente(): void {
    if (!this.autoAbrirCicloCorrente || this.statementLoading || !this.statementCycles.length) return;

    const hoje = new Date();
    const corrente = this.statementCycles.find(
      (cycle) => cycle.statementYear === hoje.getFullYear() && cycle.statementMonth === hoje.getMonth() + 1
    );

    this.autoAbrirCicloCorrente = false;
    if (!corrente) return;

    this.cicloAberto = this.cicloKey(corrente);
    this.faturaItens = this.montarItensDaFatura(corrente);
  }

  cicloKey(cycle: CardStatementCycleDto): string {
    return `${cycle.statementYear}-${cycle.statementMonth}`;
  }

  isCicloAberto(cycle: CardStatementCycleDto): boolean {
    return this.cicloAberto === this.cicloKey(cycle);
  }

  alternarFatura(cycle: CardStatementCycleDto): void {
    const key = this.cicloKey(cycle);
    if (this.cicloAberto === key) {
      this.cicloAberto = null;
      this.faturaItens = [];
      return;
    }

    this.cicloAberto = key;
    this.faturaItens = this.montarItensDaFatura(cycle);
  }

  /**
   * Junta as duas metades da mesma compra: o extrato da API sabe em qual ciclo
   * a parcela caiu (é o backend que aplica o dia de fechamento), mas não traz
   * categoria nem o total de parcelas; a despesa local traz os dois. O `id` da
   * despesa é o próprio `installmentId`, então o encontro é direto.
   *
   * Sem par local — mês que ainda não foi carregado — a linha ainda aparece,
   * com o que o extrato sabe. Some o rótulo da categoria, não a compra.
   */
  private recalcularFaturaAberta(): void {
    if (!this.cicloAberto) return;
    const cycle = this.statementCycles.find((c) => this.cicloKey(c) === this.cicloAberto);
    this.faturaItens = cycle ? this.montarItensDaFatura(cycle) : [];
  }

  private montarItensDaFatura(cycle: CardStatementCycleDto): StatementItemView[] {
    return cycle.items.map((item) => {
      const local = this.expenses.find((expense) => expense.id === item.installmentId);
      const status = local?.status ?? item.status;

      return {
        id: item.installmentId,
        titulo: local?.nome || item.title,
        categoria: local?.categoria || 'Sem categoria',
        parcela: local ? this.cardExpenseInstallmentLabel(local) : String(item.installmentNo),
        statusLabel: this.statusDaParcela(status),
        statusTone: installmentStatusTone(status),
        valor: item.amount,
        vencimento: this.dataCurta(item.dueDate)
      };
    });
  }

  private statusDaParcela(status?: string | null): string {
    switch ((status || '').toUpperCase()) {
      case 'PAID':
        return 'Paga';
      case 'ANTICIPATED':
        return 'Antecipada';
      default:
        return 'Pendente';
    }
  }

  private dataCurta(iso: string): string {
    return (iso || '').slice(0, 10).split('-').reverse().join('/');
  }

  statementMonthLabel(month: number): string {
    return formatMonthLabel(this.statementYear, month - 1, 'short').replace('.', '');
  }

  cardExpenseInstallmentLabel(expense: StoredExpense): string {
    if (expense.parcelasTotal && expense.parcelaNumero) {
      return `${expense.parcelaNumero}/${expense.parcelasTotal}`;
    }

    return '1/1';
  }

  trackByStatement(index: number, _item?: unknown): number {
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

  loadStatementCycles(): void {
    if (!this.canViewCardStatements) return;

    if (!this.statementCardId) {
      this.statementCycles = [];
      this.autoLoadedStatementCardId = null;
      this.cardsStore.selectCard(null);
      return;
    }

    this.autoLoadedStatementCardId = this.statementCardId;
    this.autoAbrirCicloCorrente = true;
    this.cicloAberto = null;
    this.faturaItens = [];
    this.cardsStore.selectCard(this.statementCardId);
    this.cardsStore.loadStatements(this.statementCardId, {
      year: this.statementYear || undefined,
      month: this.statementMonth || undefined
    });
  }
}
