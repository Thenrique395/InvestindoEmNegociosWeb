import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredCard, StoredExpense, StoredIncome } from '../data/api-data.service';
import { formatCurrencyValue, formatLocaleDate, formatMonthYearLabel, parseLocaleDate } from '../utils/locale-utils';
import { InstallmentStatus } from '../types/money-types';
import { AccountsService } from '../accounts.service';

type CalendarEventType = 'expense' | 'income' | 'card-due';

interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: Date;
  amount?: number;
  status?: string;
  meta?: string;
  category?: string;
  installmentId?: string;
}

interface CalendarCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit, OnDestroy {
  currentMonth = new Date();
  selectedDate = new Date();
  private expensesSub?: Subscription;
  private incomesSub?: Subscription;
  private cardsSub?: Subscription;

  private expenses: StoredExpense[] = [];
  private incomes: StoredIncome[] = [];
  private cards: StoredCard[] = [];
  private events: CalendarEvent[] = [];

  showExpenses = true;
  showIncomes = true;
  showCardDue = true;
  selectedCategory = 'all';
  selectedStatus = 'all';
  pendingPaymentIds = new Set<string>();
  defaultAccountId: string | null = null;

  weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

  constructor(private dataService: ApiDataService, private accountsService: AccountsService) {}

  ngOnInit(): void {
    this.defaultAccountId = this.accountsService.getDefaultAccountId();
    this.expensesSub = this.dataService.expenses$.subscribe((items) => {
      this.expenses = items || [];
      this.rebuildEvents();
    });

    this.incomesSub = this.dataService.incomes$.subscribe((items) => {
      this.incomes = items || [];
      this.rebuildEvents();
    });

    this.cardsSub = this.dataService.cards$.subscribe((items) => {
      this.cards = items || [];
      this.rebuildEvents();
    });
  }

  ngOnDestroy(): void {
    this.expensesSub?.unsubscribe();
    this.incomesSub?.unsubscribe();
    this.cardsSub?.unsubscribe();
  }

  get monthTitle(): string {
    return formatMonthYearLabel(this.currentMonth);
  }

  get visibleEvents(): CalendarEvent[] {
    return this.events
      .filter((event) => this.isSameDate(event.date, this.selectedDate))
      .filter((event) => this.matchesFilter(event))
      .sort((a, b) => {
        const typePriority: Record<CalendarEventType, number> = { expense: 1, 'card-due': 2, income: 3 };
        return typePriority[a.type] - typePriority[b.type];
      });
  }

  get categoryOptions(): string[] {
    return Array.from(
      new Set(
        this.events
          .map((event) => event.category)
          .filter((value): value is string => Boolean(value && value.trim().length))
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get statusOptions(): string[] {
    return ['OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELED', 'ANTICIPATED'];
  }

  get monthExpenseTotal(): number {
    return this.events
      .filter((event) => this.isInCurrentMonth(event.date))
      .filter((event) => event.type === 'expense')
      .reduce((sum, event) => sum + (event.amount || 0), 0);
  }

  get monthIncomeTotal(): number {
    return this.events
      .filter((event) => this.isInCurrentMonth(event.date))
      .filter((event) => event.type === 'income')
      .reduce((sum, event) => sum + (event.amount || 0), 0);
  }

  get monthProjectedBalance(): number {
    return this.monthIncomeTotal - this.monthExpenseTotal;
  }

  get monthOpenCount(): number {
    return this.events
      .filter((event) => this.isInCurrentMonth(event.date))
      .filter((event) => event.type !== 'card-due')
      .filter((event) => (event.status || 'OPEN') === 'OPEN')
      .length;
  }

  get upcomingDueCount(): number {
    const now = new Date();
    const threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    return this.events
      .filter((event) => this.isInCurrentMonth(event.date))
      .filter((event) => event.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .filter((event) => event.date <= threshold)
      .filter((event) => event.type === 'card-due' || (event.status || 'OPEN') === 'OPEN')
      .length;
  }

  get selectedDateLabel(): string {
    return formatLocaleDate(this.selectedDate);
  }

  get monthCells(): CalendarCell[] {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // semana iniciando na segunda
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalSlots = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

    const startDate = new Date(year, month, 1 - startWeekday);
    const cells: CalendarCell[] = [];
    const today = new Date();

    for (let i = 0; i < totalSlots; i += 1) {
      const cellDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const cellEvents = this.events.filter((event) => this.isSameDate(event.date, cellDate));
      cells.push({
        date: cellDate,
        inMonth: cellDate.getMonth() === month,
        isToday: this.isSameDate(cellDate, today),
        isSelected: this.isSameDate(cellDate, this.selectedDate),
        events: cellEvents
      });
    }

    return cells;
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.selectedDate = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    this.rebuildEvents();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.selectedDate = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    this.rebuildEvents();
  }

  goToToday(): void {
    const now = new Date();
    this.currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.selectedDate = now;
    this.rebuildEvents();
  }

  selectDate(date: Date): void {
    const changedMonth =
      date.getMonth() !== this.currentMonth.getMonth() ||
      date.getFullYear() !== this.currentMonth.getFullYear();

    this.selectedDate = new Date(date);
    if (changedMonth) {
      this.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      this.rebuildEvents();
    }
  }

  formatCurrency(value?: number): string {
    if (value == null) return '';
    return formatCurrencyValue(value);
  }

  eventTypeLabel(type: CalendarEventType): string {
    if (type === 'expense') return 'Despesa';
    if (type === 'income') return 'Receita';
    return 'Vencimento cartão';
  }

  badgeClass(type: CalendarEventType): string {
    if (type === 'expense') return 'badge badge--expense';
    if (type === 'income') return 'badge badge--income';
    return 'badge badge--card';
  }

  statusLabel(status?: string): string {
    const normalized = (status || '').toUpperCase() as InstallmentStatus;
    if (normalized === 'PAID') return 'Pago';
    if (normalized === 'PARTIALLY_PAID') return 'Parcialmente pago';
    if (normalized === 'CANCELED') return 'Cancelado';
    if (normalized === 'ANTICIPATED') return 'Antecipado';
    return 'Em aberto';
  }

  canMarkAsPaid(event: CalendarEvent): boolean {
    if (event.type === 'card-due') return false;
    if (!event.installmentId) return false;
    return (event.status || 'OPEN') !== 'PAID';
  }

  isPaymentPending(event: CalendarEvent): boolean {
    if (!event.installmentId) return false;
    return this.pendingPaymentIds.has(event.installmentId);
  }

  markAsPaid(event: CalendarEvent): void {
    if (!this.canMarkAsPaid(event) || !event.installmentId) return;
    const amount = event.amount || 0;
    if (amount <= 0) return;

    this.pendingPaymentIds.add(event.installmentId);
    const onComplete = () => {
      this.pendingPaymentIds.delete(event.installmentId!);
      this.rebuildEvents();
    };

    if (event.type === 'expense') {
      this.dataService.markExpensePaid(event.installmentId, amount, this.defaultAccountId).subscribe({
        next: () => onComplete(),
        error: () => onComplete()
      });
      return;
    }

    this.dataService.markIncomeReceived(event.installmentId, amount, this.defaultAccountId).subscribe({
      next: () => onComplete(),
      error: () => onComplete()
    });
  }

  hasTypeInDay(cell: CalendarCell, type: CalendarEventType): boolean {
    return cell.events.some((event) => event.type === type);
  }

  trackCell(_: number, cell: CalendarCell): string {
    return cell.date.toISOString().slice(0, 10);
  }

  trackEvent(_: number, event: CalendarEvent): string {
    return event.id;
  }

  private matchesFilter(event: CalendarEvent): boolean {
    if (event.type === 'expense' && !this.showExpenses) return false;
    if (event.type === 'income' && !this.showIncomes) return false;
    if (event.type === 'card-due' && !this.showCardDue) return false;
    if (this.selectedCategory !== 'all' && event.category !== this.selectedCategory) return false;
    if (this.selectedStatus !== 'all' && (event.status || 'OPEN') !== this.selectedStatus) return false;
    return true;
  }

  private rebuildEvents(): void {
    const events: CalendarEvent[] = [];

    for (const item of this.expenses) {
      const date = parseLocaleDate(item.vencimento || '');
      if (!date) continue;
      events.push({
        id: `expense-${item.id}`,
        type: 'expense',
        title: item.nome || 'Despesa',
        date,
        amount: item.valor || 0,
        status: item.status || 'OPEN',
        meta: item.categoria || undefined,
        category: item.categoria || undefined,
        installmentId: item.id
      });
    }

    for (const item of this.incomes) {
      const date = parseLocaleDate(item.recebimento || '');
      if (!date) continue;
      events.push({
        id: `income-${item.id}`,
        type: 'income',
        title: item.fonte || 'Receita',
        date,
        amount: item.valor || 0,
        status: item.status || 'OPEN',
        meta: item.categoria || undefined,
        category: item.categoria || undefined,
        installmentId: item.id
      });
    }

    const month = this.currentMonth.getMonth();
    const year = this.currentMonth.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (const card of this.cards) {
      const dueDay = Math.max(1, Math.min(daysInMonth, card.diaVencimento || 1));
      const date = new Date(year, month, dueDay);
      events.push({
        id: `card-due-${card.id}-${year}-${month + 1}`,
        type: 'card-due',
        title: `Vencimento cartão: ${card.nome}`,
        date,
        meta: card.banco || undefined
      });
    }

    this.events = events;
  }

  private isSameDate(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private isInCurrentMonth(date: Date): boolean {
    return (
      date.getMonth() === this.currentMonth.getMonth() &&
      date.getFullYear() === this.currentMonth.getFullYear()
    );
  }
}
