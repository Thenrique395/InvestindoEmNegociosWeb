import { StoredCard, StoredExpense, StoredIncome } from '../../core/data/api-data.service';
import { LoanContractResponse } from '../../core/loans.service';
import { Goal } from '../../core/goals.service';
import { StatusBadgeTone } from '../../shared/status-badge/status-badge.component';
import { parseLocaleDate } from '../../core/utils/locale-utils';
import { nextOccurrenceOfDay } from '../../core/utils/date-recurrence';

/**
 * Modelo puro da Agenda Financeira.
 *
 * Deriva "eventos" (compromissos com data) exclusivamente de dados reais já
 * carregados no app — despesas, receitas, cartões, financiamentos e metas.
 * Não inventa horários nem categorias: cada evento aponta para uma origem real.
 */

export type CalendarEventKind = 'income' | 'expense' | 'card-close' | 'card-due' | 'loan' | 'goal';

export type CalendarEventStatus = 'forecast' | 'paid' | 'received' | 'overdue' | 'canceled';

/** Agrupamento macro usado nos filtros da tela. */
export type CalendarEventGroup = 'income' | 'expense' | 'card' | 'loan' | 'goal';

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  group: CalendarEventGroup;
  title: string;
  /** Data local (meia-noite) do compromisso. */
  date: Date;
  amount: number | null;
  status: CalendarEventStatus;
  /** Categoria/fonte real do lançamento (nunca fabricada). */
  category: string | null;
  /** Texto auxiliar real (banco, nº da parcela, etc.). */
  meta: string | null;
  /** Id da parcela para ações (marcar pago/recebido) — quando aplicável. */
  installmentId?: string;
  /** Se o evento aceita ação de baixa direta na agenda. */
  actionable: boolean;
  /** Peso para ordenação e indicador de prioridade (maior = mais urgente). */
  priority: number;
}

export interface CalendarCategoryDescriptor {
  kind: CalendarEventKind;
  group: CalendarEventGroup;
  label: string;
  icon: string;
  tooltip: string;
  tone: StatusBadgeTone;
}

export interface DaySummary {
  count: number;
  incomeTotal: number;
  expenseTotal: number;
  net: number;
  hasOverdue: boolean;
  hasDue: boolean;
}

export interface DayGroup {
  date: Date;
  events: CalendarEvent[];
  summary: DaySummary;
}

export interface TimelineBucket {
  key: 'today' | 'tomorrow' | 'week' | 'month' | 'later';
  label: string;
  events: CalendarEvent[];
}

export interface TodayDigest {
  expenses: number;
  incomes: number;
  cards: number;
  loans: number;
  goals: number;
  total: number;
}

export interface PeriodSummary {
  incomeForecast: number;
  expenseForecast: number;
  projectedBalance: number;
  commitments: number;
  dueCount: number;
}

/** Metadados visuais de cada categoria de evento (ícone, cor, tooltip, legenda). */
export const CALENDAR_CATEGORIES: readonly CalendarCategoryDescriptor[] = [
  { kind: 'income', group: 'income', label: 'Receitas', icon: '↑', tone: 'success', tooltip: 'Entradas previstas: salário, freelance, reembolsos e outras receitas.' },
  { kind: 'expense', group: 'expense', label: 'Despesas', icon: '↓', tone: 'danger', tooltip: 'Contas e despesas com vencimento no período (água, luz, internet, etc.).' },
  { kind: 'card-close', group: 'card', label: 'Fechamento de fatura', icon: '◑', tone: 'info', tooltip: 'Dia em que a fatura do cartão fecha.' },
  { kind: 'card-due', group: 'card', label: 'Vencimento de fatura', icon: '●', tone: 'warning', tooltip: 'Dia em que a fatura do cartão precisa ser paga.' },
  { kind: 'loan', group: 'loan', label: 'Financiamentos', icon: '▤', tone: 'warning', tooltip: 'Parcelas de financiamentos e empréstimos ativos.' },
  { kind: 'goal', group: 'goal', label: 'Metas', icon: '★', tone: 'info', tooltip: 'Prazo-alvo das suas metas financeiras.' }
];

const CATEGORY_BY_KIND = new Map<CalendarEventKind, CalendarCategoryDescriptor>(
  CALENDAR_CATEGORIES.map((category) => [category.kind, category])
);

export function categoryFor(kind: CalendarEventKind): CalendarCategoryDescriptor {
  return CATEGORY_BY_KIND.get(kind) ?? CALENDAR_CATEGORIES[0];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Chave estável YYYY-MM-DD a partir da data local (sem passar por UTC). */
function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/** Interpreta datas ISO só-data (YYYY-MM-DD) como locais para evitar deslocamento de fuso. */
function parseIsoLocal(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function expenseStatus(raw: string | undefined, date: Date, today: Date): CalendarEventStatus {
  const status = (raw || 'OPEN').toUpperCase();
  if (status === 'PAID') return 'paid';
  if (status === 'CANCELED') return 'canceled';
  return startOfDay(date) < startOfDay(today) ? 'overdue' : 'forecast';
}

function incomeStatus(raw: string | undefined, date: Date, today: Date): CalendarEventStatus {
  const status = (raw || 'OPEN').toUpperCase();
  if (status === 'PAID') return 'received';
  if (status === 'CANCELED') return 'canceled';
  return startOfDay(date) < startOfDay(today) ? 'overdue' : 'forecast';
}

function priorityFor(status: CalendarEventStatus, kind: CalendarEventKind): number {
  if (status === 'overdue') return 100;
  if (status === 'canceled') return 0;
  if (kind === 'card-due' || kind === 'loan') return 60;
  if (kind === 'expense') return 50;
  return 30;
}

/** Conjunto de meses (ano/mês) que precisam de eventos recorrentes de cartão. */
function monthsWindow(monthRef: Date, today: Date): Array<{ year: number; month: number }> {
  const seen = new Set<string>();
  const result: Array<{ year: number; month: number }> = [];
  const anchors = [
    new Date(monthRef.getFullYear(), monthRef.getMonth() - 1, 1),
    new Date(monthRef.getFullYear(), monthRef.getMonth(), 1),
    new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 1),
    new Date(today.getFullYear(), today.getMonth(), 1),
    new Date(today.getFullYear(), today.getMonth() + 1, 1)
  ];
  for (const anchor of anchors) {
    const key = `${anchor.getFullYear()}-${anchor.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ year: anchor.getFullYear(), month: anchor.getMonth() });
    }
  }
  return result;
}

function clampDay(day: number, year: number, month: number): number {
  const last = new Date(year, month + 1, 0).getDate();
  return Math.max(1, Math.min(Number(day) || 1, last));
}

export interface CalendarSources {
  expenses: StoredExpense[];
  incomes: StoredIncome[];
  cards: StoredCard[];
  loans: LoanContractResponse[];
  goals: Goal[];
}

/**
 * Constrói todos os eventos do calendário a partir das fontes reais.
 * `monthRef` orienta os eventos recorrentes de cartão; `today` define atraso.
 */
export function buildCalendarEvents(sources: CalendarSources, monthRef: Date, today: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const item of sources.expenses || []) {
    const date = parseLocaleDate(item.vencimento || '');
    if (!date) continue;
    const status = expenseStatus(item.status, date, today);
    events.push({
      id: `expense-${item.id}`,
      kind: 'expense',
      group: 'expense',
      title: item.nome || 'Despesa',
      date,
      amount: item.valor || 0,
      status,
      category: item.categoria || null,
      meta: item.parcelaNumero && item.parcelasTotal ? `Parcela ${item.parcelaNumero}/${item.parcelasTotal}` : null,
      installmentId: item.id,
      actionable: status !== 'paid' && status !== 'canceled',
      priority: priorityFor(status, 'expense')
    });
  }

  for (const item of sources.incomes || []) {
    const date = parseLocaleDate(item.recebimento || '');
    if (!date) continue;
    const status = incomeStatus(item.status, date, today);
    events.push({
      id: `income-${item.id}`,
      kind: 'income',
      group: 'income',
      title: item.fonte || 'Receita',
      date,
      amount: item.valor || 0,
      status,
      category: item.categoria || null,
      meta: null,
      installmentId: item.id,
      actionable: status !== 'received' && status !== 'canceled',
      priority: priorityFor(status, 'income')
    });
  }

  const months = monthsWindow(monthRef, today);
  for (const card of sources.cards || []) {
    for (const { year, month } of months) {
      if (card.diaFechamento) {
        const closeDate = new Date(year, month, clampDay(card.diaFechamento, year, month));
        events.push({
          id: `card-close-${card.id}-${year}-${month}`,
          kind: 'card-close',
          group: 'card',
          title: `Fecha fatura · ${card.nome}`,
          date: closeDate,
          amount: null,
          status: 'forecast',
          category: card.banco || null,
          meta: card.banco || null,
          actionable: false,
          priority: priorityFor('forecast', 'card-close')
        });
      }
      if (card.diaVencimento) {
        const dueDate = new Date(year, month, clampDay(card.diaVencimento, year, month));
        events.push({
          id: `card-due-${card.id}-${year}-${month}`,
          kind: 'card-due',
          group: 'card',
          title: `Vence fatura · ${card.nome}`,
          date: dueDate,
          amount: null,
          status: 'forecast',
          category: card.banco || null,
          meta: card.banco || null,
          actionable: false,
          priority: priorityFor('forecast', 'card-due')
        });
      }
    }
  }

  for (const contract of sources.loans || []) {
    for (const installment of contract.installments || []) {
      const date = parseIsoLocal(installment.dueDate);
      if (!date) continue;
      const paid = installment.status === 'Paid';
      const status: CalendarEventStatus = paid
        ? 'paid'
        : startOfDay(date) < startOfDay(today)
          ? 'overdue'
          : 'forecast';
      events.push({
        id: `loan-${contract.id}-${installment.id}`,
        kind: 'loan',
        group: 'loan',
        title: `${contract.title || 'Financiamento'}`,
        date,
        amount: installment.totalAmount || 0,
        status,
        category: 'Financiamento',
        meta: `Parcela ${installment.installmentNo}/${contract.termMonths}`,
        actionable: false,
        priority: priorityFor(status, 'loan')
      });
    }
  }

  for (const goal of sources.goals || []) {
    const date = parseIsoLocal(goal.targetDate);
    if (!date) continue;
    const completed = goal.status === 'Completed';
    const canceled = goal.status === 'Canceled';
    const status: CalendarEventStatus = completed
      ? 'paid'
      : canceled
        ? 'canceled'
        : startOfDay(date) < startOfDay(today)
          ? 'overdue'
          : 'forecast';
    events.push({
      id: `goal-${goal.id}`,
      kind: 'goal',
      group: 'goal',
      title: `Meta · ${goal.title}`,
      date,
      amount: goal.targetAmount || null,
      status,
      category: 'Meta',
      meta: null,
      actionable: false,
      priority: priorityFor(status, 'goal')
    });
  }

  return events;
}

/** Ordena por urgência (prioridade desc) e depois por tipo, dentro de um mesmo dia. */
export function sortDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title, 'pt-BR'));
}

export function eventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return sortDayEvents(events.filter((event) => isSameDay(event.date, date)));
}

export function summarizeDay(events: CalendarEvent[]): DaySummary {
  let incomeTotal = 0;
  let expenseTotal = 0;
  let hasOverdue = false;
  let hasDue = false;
  for (const event of events) {
    if (event.status === 'canceled') continue;
    if (event.group === 'income') incomeTotal += event.amount || 0;
    if (event.group === 'expense' || event.group === 'loan') expenseTotal += event.amount || 0;
    if (event.status === 'overdue') hasOverdue = true;
    if (event.kind === 'card-due' || event.kind === 'loan' || event.group === 'expense') hasDue = true;
  }
  return {
    count: events.length,
    incomeTotal,
    expenseTotal,
    net: incomeTotal - expenseTotal,
    hasOverdue,
    hasDue
  };
}

export function isInMonth(date: Date, monthRef: Date): boolean {
  return date.getMonth() === monthRef.getMonth() && date.getFullYear() === monthRef.getFullYear();
}

export function buildPeriodSummary(events: CalendarEvent[], monthRef: Date): PeriodSummary {
  const monthEvents = events.filter((event) => isInMonth(event.date, monthRef) && event.status !== 'canceled');
  const incomeForecast = monthEvents
    .filter((event) => event.group === 'income')
    .reduce((sum, event) => sum + (event.amount || 0), 0);
  const expenseForecast = monthEvents
    .filter((event) => event.group === 'expense' || event.group === 'loan')
    .reduce((sum, event) => sum + (event.amount || 0), 0);
  const dueCount = monthEvents.filter(
    (event) => event.kind === 'card-due' || event.group === 'loan' || event.group === 'expense'
  ).length;
  const commitments = monthEvents.filter((event) => event.kind !== 'card-close').length;
  return {
    incomeForecast,
    expenseForecast,
    projectedBalance: incomeForecast - expenseForecast,
    commitments,
    dueCount
  };
}

/** Eventos dentro da janela [today, today+days], excluindo cancelados e já quitados. */
export function upcomingEvents(events: CalendarEvent[], today: Date, days = 7): CalendarEvent[] {
  const start = startOfDay(today);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days);
  return events
    .filter((event) => event.status !== 'canceled' && event.status !== 'paid' && event.status !== 'received')
    .filter((event) => {
      const date = startOfDay(event.date);
      return date >= start && date <= end;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime() || b.priority - a.priority);
}

/** Compromissos atrasados (vencidos e ainda em aberto). */
export function pendingEvents(events: CalendarEvent[], today: Date): CalendarEvent[] {
  return events
    .filter((event) => event.status === 'overdue')
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function todayDigest(events: CalendarEvent[], today: Date): TodayDigest {
  const dayEvents = events.filter((event) => isSameDay(event.date, today) && event.status !== 'canceled');
  const digest: TodayDigest = { expenses: 0, incomes: 0, cards: 0, loans: 0, goals: 0, total: dayEvents.length };
  for (const event of dayEvents) {
    if (event.group === 'expense') digest.expenses += 1;
    else if (event.group === 'income') digest.incomes += 1;
    else if (event.group === 'card') digest.cards += 1;
    else if (event.group === 'loan') digest.loans += 1;
    else if (event.group === 'goal') digest.goals += 1;
  }
  return digest;
}

/** Agrupa eventos por dia (ordenados por data crescente), a partir de `from`. */
export function groupByDay(events: CalendarEvent[], from?: Date): DayGroup[] {
  const floor = from ? startOfDay(from) : null;
  const buckets = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const day = startOfDay(event.date);
    if (floor && day < floor) continue;
    const key = localDayKey(day);
    const list = buckets.get(key);
    if (list) list.push(event);
    else buckets.set(key, [event]);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const [year, month, day] = key.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const sorted = sortDayEvents(list);
      return { date, events: sorted, summary: summarizeDay(sorted) };
    });
}

/** Distribui eventos futuros em faixas cronológicas (hoje/amanhã/semana/mês/depois). */
export function buildTimeline(events: CalendarEvent[], today: Date): TimelineBucket[] {
  const buckets: Record<TimelineBucket['key'], CalendarEvent[]> = {
    today: [],
    tomorrow: [],
    week: [],
    month: [],
    later: []
  };
  const start = startOfDay(today);
  for (const event of events) {
    const diff = daysBetween(start, event.date);
    if (diff < 0) continue;
    if (diff === 0) buckets.today.push(event);
    else if (diff === 1) buckets.tomorrow.push(event);
    else if (diff <= 7) buckets.week.push(event);
    else if (diff <= 31) buckets.month.push(event);
    else buckets.later.push(event);
  }
  const labels: Record<TimelineBucket['key'], string> = {
    today: 'Hoje',
    tomorrow: 'Amanhã',
    week: 'Esta semana',
    month: 'Este mês',
    later: 'Mais adiante'
  };
  return (Object.keys(buckets) as TimelineBucket['key'][]).map((key) => ({
    key,
    label: labels[key],
    events: buckets[key].sort((a, b) => a.date.getTime() - b.date.getTime() || b.priority - a.priority)
  }));
}

export function statusLabel(status: CalendarEventStatus): string {
  switch (status) {
    case 'paid': return 'Pago';
    case 'received': return 'Recebido';
    case 'overdue': return 'Atrasado';
    case 'canceled': return 'Cancelado';
    default: return 'Previsto';
  }
}

export function statusTone(status: CalendarEventStatus): StatusBadgeTone {
  switch (status) {
    case 'paid':
    case 'received': return 'success';
    case 'overdue': return 'danger';
    case 'canceled': return 'muted';
    default: return 'info';
  }
}
