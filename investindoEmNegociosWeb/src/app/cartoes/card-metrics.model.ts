import { StoredCard, StoredExpense } from '../data/api-data.service';
import { isExpenseOpen } from '../utils/home-insight.utils';
import { parseLocaleDate } from '../utils/locale-utils';

export type UsageTone = 'ok' | 'warning' | 'critical';
export type CardStatus = 'overdue' | 'due-soon' | 'on-track' | 'no-invoice';
export type StatementStatus = 'open' | 'closed' | 'paid' | 'overdue';

export interface CardMetrics {
  card: StoredCard;
  /** Soma das despesas de cartão em aberto (aproxima o limite comprometido). */
  usedAmount: number;
  availableAmount: number;
  usagePercent: number;
  usageTone: UsageTone;
  openCount: number;
  overdueCount: number;
  nextDueDate: Date | null;
  daysUntilDue: number | null;
  bestPurchaseDay: number;
  status: CardStatus;
}

export interface CardsOverview {
  totalOpen: number;
  totalLimit: number;
  totalUsed: number;
  overallUsagePercent: number;
  overallUsageTone: UsageTone;
  activeCards: number;
  cardsWithOpenInvoice: number;
  nextInvoice: { cardName: string; daysUntilDue: number; amount: number } | null;
}

const DUE_SOON_DAYS = 7;

export function usageToneFor(percent: number): UsageTone {
  if (percent > 80) return 'critical';
  if (percent > 50) return 'warning';
  return 'ok';
}

export function bestPurchaseDay(closingDay: number): number {
  const day = Number(closingDay) || 1;
  return day >= 31 ? 1 : day + 1;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Próxima ocorrência de um dia do mês a partir de `today` (hoje conta como
 * próxima). Dias maiores que o último dia do mês (ex.: 31 em fevereiro) caem no
 * último dia daquele mês.
 */
export function nextOccurrenceOfDay(day: number, today: Date): Date {
  const wanted = Math.max(Number(day) || 1, 1);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let year = today.getFullYear();
  let month = today.getMonth();
  let candidate = new Date(year, month, Math.min(wanted, lastDayOfMonth(year, month)));
  if (candidate < base) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    candidate = new Date(year, month, Math.min(wanted, lastDayOfMonth(year, month)));
  }
  return candidate;
}

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function buildCardMetrics(card: StoredCard, expenses: StoredExpense[], today: Date): CardMetrics {
  const open = expenses.filter((e) => e.cartao === card.id && isExpenseOpen(e.status));
  const usedAmount = open.reduce((sum, e) => sum + (e.valor || 0), 0);
  const limit = card.limiteCredito || 0;
  const availableAmount = Math.max(limit - usedAmount, 0);
  const usagePercent = limit > 0 ? Math.min((usedAmount / limit) * 100, 999) : 0;

  const overdueCount = open.filter((e) => {
    const due = parseLocaleDate(e.vencimento);
    return !!due && due < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }).length;

  const nextDueDate = usedAmount > 0 ? nextOccurrenceOfDay(card.diaVencimento, today) : null;
  const daysUntilDue = nextDueDate ? daysBetween(today, nextDueDate) : null;

  let status: CardStatus = 'no-invoice';
  if (usedAmount > 0) {
    if (overdueCount > 0) status = 'overdue';
    else if (daysUntilDue !== null && daysUntilDue <= DUE_SOON_DAYS) status = 'due-soon';
    else status = 'on-track';
  }

  return {
    card,
    usedAmount,
    availableAmount,
    usagePercent,
    usageTone: usageToneFor(usagePercent),
    openCount: open.length,
    overdueCount,
    nextDueDate,
    daysUntilDue,
    bestPurchaseDay: bestPurchaseDay(card.diaFechamento),
    status
  };
}

export function buildCardsOverview(cards: StoredCard[], expenses: StoredExpense[], today: Date): CardsOverview {
  return overviewFromMetrics(cards.map((card) => buildCardMetrics(card, expenses, today)));
}

/** Deriva o resumo agregado de métricas já calculadas (evita recomputar). */
export function overviewFromMetrics(metrics: CardMetrics[]): CardsOverview {
  const totalOpen = metrics.reduce((sum, m) => sum + m.usedAmount, 0);
  const cards = metrics.map((m) => m.card);
  const totalLimit = cards.reduce((sum, c) => sum + (c.limiteCredito || 0), 0);
  const totalUsed = totalOpen;
  const overallUsagePercent = totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 999) : 0;
  const cardsWithOpenInvoice = metrics.filter((m) => m.usedAmount > 0).length;

  const withDue = metrics
    .filter((m) => m.daysUntilDue !== null)
    .sort((a, b) => (a.daysUntilDue as number) - (b.daysUntilDue as number));
  const soonest = withDue[0];

  return {
    totalOpen,
    totalLimit,
    totalUsed,
    overallUsagePercent,
    overallUsageTone: usageToneFor(overallUsagePercent),
    activeCards: cards.length,
    cardsWithOpenInvoice,
    nextInvoice: soonest
      ? {
          cardName: soonest.card.nome,
          daysUntilDue: soonest.daysUntilDue as number,
          amount: soonest.usedAmount
        }
      : null
  };
}

/** Status de um ciclo de fatura a partir dos totais e datas do statement. */
export function statementStatusFor(
  cycle: { totalAmount: number; totalOpen: number; statementCloseDate: string; statementDueDate: string },
  today: Date
): StatementStatus {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = parseIsoDate(cycle.statementDueDate);
  const close = parseIsoDate(cycle.statementCloseDate);

  if (cycle.totalOpen <= 0 && cycle.totalAmount > 0) return 'paid';
  if (cycle.totalOpen > 0 && due && due < base) return 'overdue';
  if (close && close < base) return 'closed';
  return 'open';
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  // Interpreta datas ISO só-data como locais (new Date('YYYY-MM-DD') seria UTC,
  // deslocando o dia em fusos negativos ao comparar com a meia-noite local).
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
