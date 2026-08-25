import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { SelectMenuComponent } from '../shared/select-menu/select-menu.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiDataService, StoredCard, StoredExpense, StoredIncome } from '../data/api-data.service';
import { LoansService, LoanContractResponse } from '../loans.service';
import { GoalsService, Goal } from '../goals.service';
import { AccountsService } from '../accounts.service';
import { UiPermissionsService } from '../ui-permissions.service';
import { formatMonthYearLabel } from '../utils/locale-utils';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { FilterBarComponent } from '../shared/filter-bar/filter-bar.component';
import { KpiItem, KpiStripComponent } from '../shared/kpi-strip/kpi-strip.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { FinancialCalendarComponent } from './financial-calendar.component';
import { FinancialAgendaComponent } from './financial-agenda.component';
import { FinancialTimelineComponent } from './financial-timeline.component';
import { FinancialEventCardComponent } from './financial-event-card.component';
import { CalendarSidebarComponent } from './calendar-sidebar.component';
import { ReceitaFormModalComponent } from '../receitas/receita-form-modal.component';
import { CartaoFormComponent } from '../cartoes/cartao-form.component';
import { DespesaFormModalComponent } from '../despesas/despesa-form-modal.component';
import { LoanFormModalComponent } from '../loans/loan-form-modal.component';
import { MetaFormModalComponent } from '../metas/meta-form-modal.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import { FinancialPrivacyService } from '../financial-privacy.service';
import { formatCurrencyValue } from '../utils/locale-utils';
import {
  buildCalendarEvents,
  buildPeriodSummary,
  buildTimeline,
  CalendarEvent,
  CalendarEventGroup,
  CalendarEventKind,
  categoryFor,
  DayGroup,
  eventsForDay,
  groupByDay,
  isInMonth,
  pendingEvents,
  PeriodSummary,
  startOfDay,
  TimelineBucket,
  TodayDigest,
  todayDigest,
  upcomingEvents
} from './calendar-agenda.model';

type CalendarView = 'month' | 'week' | 'agenda' | 'timeline';
type GroupFilter = 'all' | CalendarEventGroup;

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [
    FormsModule,
    PageHeaderComponent,
    FilterBarComponent,
    KpiStripComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    SegmentedSelectorComponent,
    FinancialCalendarComponent,
    FinancialAgendaComponent,
    FinancialTimelineComponent,
    FinancialEventCardComponent,
    CalendarSidebarComponent,
    ReceitaFormModalComponent,
    CartaoFormComponent,
    DespesaFormModalComponent,
    LoanFormModalComponent,
    MetaFormModalComponent,
    SelectMenuComponent
  ],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarioComponent implements OnInit {

  /** `categoryOptions()` devolve nomes; o dropdown precisa de value+label. */
  readonly categorySelectOptions = computed(() => [
    { value: 'all', label: 'Todas as categorias' },
    ...this.categoryOptions().map((c) => ({ value: c, label: c }))
  ]);

  readonly statusSelectOptions = [
    { value: 'all', label: 'Todos os status' },
    { value: 'forecast', label: 'Previsto' },
    { value: 'paid', label: 'Pago' },
    { value: 'received', label: 'Recebido' },
    { value: 'overdue', label: 'Atrasado' },
    { value: 'canceled', label: 'Cancelado' }
  ];
  readonly today = new Date();
  currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  selectedDate = new Date();

  view: CalendarView = 'month';
  groupFilter: GroupFilter = 'all';
  selectedCategory = 'all';
  selectedStatus = 'all';
  showNewMenu = false;

  readonly canAdvanced: boolean;

  private expenses: StoredExpense[] = [];
  private incomes: StoredIncome[] = [];
  private cards: StoredCard[] = [];
  private loans: LoanContractResponse[] = [];
  private goals: Goal[] = [];
  private defaultAccountId: string | null = null;
  readonly allEvents = signal<CalendarEvent[]>([]);

  // View models derivados por signal (A9): recompute()/rebuild() rodam a partir de
  // subscribes assíncronos (dados/HTTP fora da zona), então signals dirigem a re-render.
  readonly filteredCount = signal(0);
  readonly dayEvents = signal<CalendarEvent[]>([]);
  readonly weekGroups = signal<DayGroup[]>([]);
  readonly agendaGroups = signal<DayGroup[]>([]);
  readonly timelineBuckets = signal<TimelineBucket[]>([]);
  readonly periodSummary = signal<PeriodSummary>({ incomeForecast: 0, expenseForecast: 0, projectedBalance: 0, commitments: 0, dueCount: 0 });
  readonly digest = signal<TodayDigest>({ expenses: 0, incomes: 0, cards: 0, loans: 0, goals: 0, total: 0 });
  readonly upcoming = signal<CalendarEvent[]>([]);
  readonly pending = signal<CalendarEvent[]>([]);

  /**
   * Faixa unida do formato (b) — COMPONENTES.md §3.1 atribui Calendário a ele.
   * O `computed` só adapta o resumo ao contrato; a semântica continua no modelo.
   */
  private readonly privacy = inject(FinancialPrivacyService);

  /** Mesmo comportamento do AppCurrencyPipe: respeita "ocultar valores" da topbar. */
  private currency(value: number): string {
    return this.privacy.hidden() ? '••••••' : formatCurrencyValue(value);
  }

  readonly kpiItems = computed<KpiItem[]>(() => {
    const s = this.periodSummary();
    return [
      {
        key: 'receitas', label: 'Receitas previstas', tone: 'success',
        value: this.currency(s.incomeForecast),
        note: `Entradas previstas em ${this.monthTitle}.`,
        tooltip: 'Soma das receitas com data no mês exibido, previstas ou já recebidas. Lançamento cancelado não entra.',
      },
      {
        key: 'despesas', label: 'Despesas previstas', tone: 'danger',
        value: this.currency(s.expenseForecast),
        note: 'Contas e parcelas a pagar no período.',
        tooltip: 'Despesas do mês somadas às parcelas de empréstimo e financiamento, que também vencem no período. Fatura de cartão entra pelo vencimento, não pelo fechamento.',
      },
      {
        key: 'saldo', label: 'Saldo previsto', tone: s.projectedBalance >= 0 ? 'info' : 'warning',
        value: this.currency(s.projectedBalance),
        note: 'Diferença entre o que entra e o que sai.',
        tooltip: 'Receitas previstas menos despesas previstas do mês. É o fluxo do período isolado — não soma o saldo que você já tem em conta.',
      },
      {
        key: 'compromissos', label: 'Compromissos', tone: 'neutral',
        value: s.commitments.toString(),
        note: `Vencimentos no mês: ${s.dueCount}`,
        tooltip: 'Todos os eventos do mês — receitas, despesas, parcelas, metas e vencimento de fatura. O fechamento de fatura não conta, porque não é uma data em que algo precisa ser pago.',
      },
      {
        key: 'pendencias', label: 'Pendências', tone: 'warning',
        value: this.pending().length.toString(),
        note: 'Compromissos atrasados a regularizar.',
        tooltip: 'Compromissos com vencimento já passado e ainda não quitados, de qualquer mês — não só do período exibido.',
      },
    ];
  });
  readonly categoryOptions = signal<string[]>([]);
  readonly viewHasEvents = signal(false);

  pendingPaymentIds = new Set<string>();

  constructor(
    private readonly dataService: ApiDataService,
    private readonly loansService: LoansService,
    private readonly goalsService: GoalsService,
    private readonly accountsService: AccountsService,
    private readonly permissions: UiPermissionsService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {
    this.canAdvanced = this.permissions.canUseAdvancedCalendarViews();
    if (this.canAdvanced && typeof window !== 'undefined' && window.innerWidth < 768) {
      this.view = 'agenda';
    }
  }

  ngOnInit(): void {
    this.defaultAccountId = this.accountsService.getDefaultAccountId();

    this.dataService.expenses$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.expenses = items || [];
      this.rebuild();
    });
    this.dataService.incomes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.incomes = items || [];
      this.rebuild();
    });
    this.dataService.cards$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.cards = items || [];
      this.rebuild();
    });

    // Financiamentos e metas têm datas reais; toleramos falha (ex.: sem acesso).
    this.loansService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.loans = items || [];
        this.rebuild();
      },
      error: () => {
        this.loans = [];
        this.rebuild();
      }
    });
    this.goalsService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.goals = items || [];
        this.rebuild();
      },
      error: () => {
        this.goals = [];
        this.rebuild();
      }
    });
  }

  get monthTitle(): string {
    return formatMonthYearLabel(this.currentMonth);
  }

  get selectedDateLabel(): string {
    return this.selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  get viewOptions(): SegmentOption[] {
    return [
      { value: 'month', label: 'Mês' },
      { value: 'week', label: 'Semana' },
      { value: 'agenda', label: 'Agenda', hidden: !this.canAdvanced },
      { value: 'timeline', label: 'Linha do tempo', hidden: !this.canAdvanced }
    ];
  }

  /**
   * O filtro por tipo carrega a cor de cada grupo no próprio segmento, e é por
   * isso que a tela não tem mais uma faixa de legenda ao lado: eram os mesmos
   * seis rótulos duas vezes, um deles clicável e o outro não. O tooltip guarda
   * a explicação longa que estava na legenda — inclusive a de que "Cartões"
   * cobre fechamento e vencimento de fatura, que não cabe no rótulo.
   */
  get groupOptions(): SegmentOption[] {
    return [
      { value: 'all', label: 'Todos', title: 'Todos os compromissos do período.' },
      { value: 'income', label: 'Receitas', dot: 'var(--income)', title: this.legendTooltip('income') },
      { value: 'expense', label: 'Despesas', dot: 'var(--expense)', title: this.legendTooltip('expense') },
      { value: 'card', label: 'Cartões', dot: 'var(--primary)', title: this.cardTooltip },
      { value: 'loan', label: 'Financiamentos', dot: 'var(--warning)', title: this.legendTooltip('loan') },
      { value: 'goal', label: 'Metas', dot: 'var(--brand-navy-soft)', title: this.legendTooltip('goal') }
    ];
  }

  private legendTooltip(kind: CalendarEventKind): string {
    return categoryFor(kind).tooltip;
  }

  private get cardTooltip(): string {
    return `${this.legendTooltip('card-close')} ${this.legendTooltip('card-due')}`;
  }

  setView(view: string): void {
    this.view = view as CalendarView;
    this.recompute();
    this.cdr.markForCheck();
  }

  setGroupFilter(value: string): void {
    this.groupFilter = value as GroupFilter;
    this.recompute();
    this.cdr.markForCheck();
  }

  onFilterChange(): void {
    this.recompute();
    this.cdr.markForCheck();
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.selectedDate = new Date(this.currentMonth);
    this.rebuild();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.selectedDate = new Date(this.currentMonth);
    this.rebuild();
  }

  goToToday(): void {
    this.currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.selectedDate = new Date(this.today);
    this.rebuild();
  }

  selectDate(date: Date): void {
    const changedMonth = date.getMonth() !== this.currentMonth.getMonth() || date.getFullYear() !== this.currentMonth.getFullYear();
    this.selectedDate = new Date(date);
    if (changedMonth) {
      this.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      this.rebuild();
    } else {
      this.recompute();
      this.cdr.markForCheck();
    }
  }

  onEventSelected(event: CalendarEvent): void {
    this.selectDate(event.date);
  }

  /**
   * "Ver todos" da lateral: leva para a lista completa. A agenda é a visão que
   * mostra tudo por data, mas ela é de plano avançado — sem permissão, a
   * semana é o mais próximo disso.
   */
  showAllUpcoming(): void {
    this.setView(this.canAdvanced ? 'agenda' : 'week');
  }

  toggleNewMenu(): void {
    this.showNewMenu = !this.showNewMenu;
  }

  closeNewMenu(): void {
    this.showNewMenu = false;
  }

  /**
   * Qual modal de criação está aberto — um de cada vez. Um campo só, e não um
   * booleano por entidade, porque abrir dois ao mesmo tempo não é estado válido.
   */
  novoAberto: 'income' | 'expense' | 'card' | 'loan' | 'goal' | null = null;

  abrirNovo(tipo: 'income' | 'expense' | 'card' | 'loan' | 'goal'): void {
    this.showNewMenu = false;
    this.novoAberto = tipo;
  }

  fecharNovo(): void {
    this.novoAberto = null;
    this.cdr.markForCheck();
  }

  /** Gravou: o evento tem que nascer no calendário sem recarregar a página. */
  onNovoSalvo(): void {
    this.novoAberto = null;
    this.rebuild();
    this.cdr.markForCheck();
  }

  /** Navegação avulsa do menu — hoje só o atalho de tela cheia. */
  createFor(route: string): void {
    this.showNewMenu = false;
    this.router.navigate([route]);
  }

  markDone(event: CalendarEvent): void {
    if (!event.actionable || !event.installmentId) return;
    const amount = event.amount || 0;
    if (amount <= 0) return;

    this.pendingPaymentIds.add(event.id);
    this.cdr.markForCheck();
    const finish = () => {
      this.pendingPaymentIds.delete(event.id);
      this.rebuild();
    };

    if (event.group === 'income') {
      this.dataService.markIncomeReceived(event.installmentId, amount, this.defaultAccountId).subscribe({ next: finish, error: finish });
    } else {
      this.dataService.markExpensePaid(event.installmentId, amount, this.defaultAccountId).subscribe({ next: finish, error: finish });
    }
  }

  private rebuild(): void {
    const allEvents = buildCalendarEvents(
      { expenses: this.expenses, incomes: this.incomes, cards: this.cards, loans: this.loans, goals: this.goals },
      this.currentMonth,
      this.today
    );
    this.allEvents.set(allEvents);
    this.categoryOptions.set(Array.from(
      new Set(allEvents.map((event) => event.category).filter((value): value is string => !!value && value.trim().length > 0))
    ).sort((a, b) => a.localeCompare(b, 'pt-BR')));
    this.recompute();
    this.cdr.markForCheck();
  }

  private matchesFilter(event: CalendarEvent): boolean {
    if (this.groupFilter !== 'all' && event.group !== this.groupFilter) return false;
    if (this.canAdvanced) {
      if (this.selectedCategory !== 'all' && event.category !== this.selectedCategory) return false;
      if (this.selectedStatus !== 'all' && event.status !== this.selectedStatus) return false;
    }
    return true;
  }

  /** Filtra e deriva todos os view models a partir de allEvents. */
  private recompute(): void {
    const filtered = this.allEvents().filter((event) => this.matchesFilter(event));
    this.filteredCount.set(filtered.length);

    this.dayEvents.set(eventsForDay(filtered, this.selectedDate));
    this.periodSummary.set(buildPeriodSummary(filtered, this.currentMonth));
    this.digest.set(todayDigest(filtered, this.today));
    this.upcoming.set(upcomingEvents(filtered, this.today, 7).slice(0, 6));
    this.pending.set(pendingEvents(filtered, this.today).slice(0, 6));

    const weekStart = this.startOfWeek(this.selectedDate);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
    const weekEvents = filtered.filter((event) => {
      const day = startOfDay(event.date);
      return day >= weekStart && day <= weekEnd;
    });
    const weekGroups = groupByDay(weekEvents);
    this.weekGroups.set(weekGroups);

    const agendaGroups = groupByDay(filtered, this.today);
    this.agendaGroups.set(agendaGroups);
    const timelineBuckets = buildTimeline(filtered, this.today);
    this.timelineBuckets.set(timelineBuckets);

    this.viewHasEvents.set(this.computeViewHasEvents(filtered, weekGroups, agendaGroups, timelineBuckets));
  }

  private computeViewHasEvents(filtered: CalendarEvent[], weekGroups: DayGroup[], agendaGroups: DayGroup[], timelineBuckets: TimelineBucket[]): boolean {
    switch (this.view) {
      case 'month':
        return filtered.some((event) => isInMonth(event.date, this.currentMonth));
      case 'week':
        return weekGroups.length > 0;
      case 'agenda':
        return agendaGroups.length > 0;
      case 'timeline':
        return timelineBuckets.some((bucket) => bucket.events.length > 0);
      default:
        return filtered.length > 0;
    }
  }

  private startOfWeek(date: Date): Date {
    const day = startOfDay(date);
    const offset = (day.getDay() + 6) % 7; // segunda = 0
    return new Date(day.getFullYear(), day.getMonth(), day.getDate() - offset);
  }
}
