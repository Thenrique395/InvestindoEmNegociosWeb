import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
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
import { TransactionSummaryCardComponent } from '../shared/transactions/transaction-summary-card.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { FinancialCalendarComponent } from './financial-calendar.component';
import { FinancialAgendaComponent } from './financial-agenda.component';
import { FinancialTimelineComponent } from './financial-timeline.component';
import { FinancialEventCardComponent } from './financial-event-card.component';
import { CalendarSidebarComponent } from './calendar-sidebar.component';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';
import {
  buildCalendarEvents,
  buildPeriodSummary,
  buildTimeline,
  CalendarEvent,
  CalendarEventGroup,
  CALENDAR_CATEGORIES,
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
    TransactionSummaryCardComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    SegmentedSelectorComponent,
    FinancialCalendarComponent,
    FinancialAgendaComponent,
    FinancialTimelineComponent,
    FinancialEventCardComponent,
    CalendarSidebarComponent,
    AppCurrencyPipe
  ],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarioComponent implements OnInit {
  readonly today = new Date();
  currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
  selectedDate = new Date();

  view: CalendarView = 'month';
  groupFilter: GroupFilter = 'all';
  selectedCategory = 'all';
  selectedStatus = 'all';
  showNewMenu = false;

  readonly legend = CALENDAR_CATEGORIES;
  readonly canAdvanced: boolean;

  private expenses: StoredExpense[] = [];
  private incomes: StoredIncome[] = [];
  private cards: StoredCard[] = [];
  private loans: LoanContractResponse[] = [];
  private goals: Goal[] = [];
  private defaultAccountId: string | null = null;
  allEvents: CalendarEvent[] = [];

  // View models derivados (recalculados em recompute()).
  filteredCount = 0;
  dayEvents: CalendarEvent[] = [];
  weekGroups: DayGroup[] = [];
  agendaGroups: DayGroup[] = [];
  timelineBuckets: TimelineBucket[] = [];
  periodSummary: PeriodSummary = { incomeForecast: 0, expenseForecast: 0, projectedBalance: 0, commitments: 0, dueCount: 0 };
  digest: TodayDigest = { expenses: 0, incomes: 0, cards: 0, loans: 0, goals: 0, total: 0 };
  upcoming: CalendarEvent[] = [];
  pending: CalendarEvent[] = [];
  categoryOptions: string[] = [];
  viewHasEvents = false;

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
      { value: 'month', label: 'Mês', icon: '▦' },
      { value: 'week', label: 'Semana', icon: '▤' },
      { value: 'agenda', label: 'Agenda', icon: '☰', hidden: !this.canAdvanced },
      { value: 'timeline', label: 'Timeline', icon: '↳', hidden: !this.canAdvanced }
    ];
  }

  get groupOptions(): SegmentOption[] {
    return [
      { value: 'all', label: 'Todos' },
      { value: 'income', label: 'Receitas' },
      { value: 'expense', label: 'Despesas' },
      { value: 'card', label: 'Cartões' },
      { value: 'loan', label: 'Parcelas' },
      { value: 'goal', label: 'Metas' }
    ];
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

  toggleNewMenu(): void {
    this.showNewMenu = !this.showNewMenu;
  }

  closeNewMenu(): void {
    this.showNewMenu = false;
  }

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
    this.allEvents = buildCalendarEvents(
      { expenses: this.expenses, incomes: this.incomes, cards: this.cards, loans: this.loans, goals: this.goals },
      this.currentMonth,
      this.today
    );
    this.categoryOptions = Array.from(
      new Set(this.allEvents.map((event) => event.category).filter((value): value is string => !!value && value.trim().length > 0))
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
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
    const filtered = this.allEvents.filter((event) => this.matchesFilter(event));
    this.filteredCount = filtered.length;

    this.dayEvents = eventsForDay(filtered, this.selectedDate);
    this.periodSummary = buildPeriodSummary(filtered, this.currentMonth);
    this.digest = todayDigest(filtered, this.today);
    this.upcoming = upcomingEvents(filtered, this.today, 7).slice(0, 6);
    this.pending = pendingEvents(filtered, this.today).slice(0, 6);

    const weekStart = this.startOfWeek(this.selectedDate);
    const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
    const weekEvents = filtered.filter((event) => {
      const day = startOfDay(event.date);
      return day >= weekStart && day <= weekEnd;
    });
    this.weekGroups = groupByDay(weekEvents);

    this.agendaGroups = groupByDay(filtered, this.today);
    this.timelineBuckets = buildTimeline(filtered, this.today);

    this.viewHasEvents = this.computeViewHasEvents(filtered);
  }

  private computeViewHasEvents(filtered: CalendarEvent[]): boolean {
    switch (this.view) {
      case 'month':
        return filtered.some((event) => isInMonth(event.date, this.currentMonth));
      case 'week':
        return this.weekGroups.length > 0;
      case 'agenda':
        return this.agendaGroups.length > 0;
      case 'timeline':
        return this.timelineBuckets.some((bucket) => bucket.events.length > 0);
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
