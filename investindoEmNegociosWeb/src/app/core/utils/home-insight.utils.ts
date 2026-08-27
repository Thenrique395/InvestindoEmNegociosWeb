import { StoredExpense, StoredIncome } from '../data/api-data.service';
import { InsightEngineItemResponse } from '../accounts.service';
import { formatCurrencyValue, parseLocaleDate } from './locale-utils';

export function formatCurrency(value: number): string {
  return formatCurrencyValue(value);
}

export function formatDelta(current: number, previous: number): string {
  if (previous <= 0 && current > 0) return `novo no mês (${formatCurrency(current)})`;
  if (previous <= 0 && current <= 0) return 'sem variação';
  const deltaPercent = ((current - previous) / previous) * 100;
  const trend = deltaPercent > 0 ? '+' : '';
  return `${trend}${deltaPercent.toFixed(0)}% vs mês anterior`;
}

export function calculateInsightHealthScore(
  incomeReceived: number,
  incomePending: number,
  expenseTotal: number,
  overdueExpensesCount: number,
  overdueIncomesCount: number,
  dueSoonExpenseAmount: number,
  projectedBalance: number
): number {
  let score = 100;

  if (overdueExpensesCount > 0) score -= Math.min(35, overdueExpensesCount * 12);
  if (overdueIncomesCount > 0) score -= Math.min(20, overdueIncomesCount * 8);
  if (incomeReceived <= 0 && incomePending > 0) score -= 20;
  if (expenseTotal > 0 && incomeReceived > 0 && incomeReceived / expenseTotal < 0.6) score -= 15;
  if (dueSoonExpenseAmount > incomeReceived && dueSoonExpenseAmount > 0) score -= 10;
  if (projectedBalance < 0) score -= 20;

  return Math.max(0, Math.min(100, score));
}

export function rangeEndDate(endKey: string): Date {
  const [yearText, monthText] = endKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const lastDay = new Date(year, month, 0);
  return new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isExpenseOpen(status?: string): boolean {
  return !status || status === 'OPEN' || status === 'PARTIALLY_PAID';
}

export function isIncomeReceived(status?: string): boolean {
  return status === 'PAID' || status === 'PARTIALLY_PAID' || status === 'ANTICIPATED';
}

export function isIncomePending(status?: string): boolean {
  return !status || status === 'OPEN';
}

export function hasCriticalOverdueExpenseContext(
  overdueExpensesCount: number,
  overdueExpensesAmount: number,
  saldoBaseDisponivel: number,
  saldoPrincipal: number
): boolean {
  if (overdueExpensesCount <= 0) return false;
  const amount = Math.max(overdueExpensesAmount || 0, 0);
  const availableNow = Math.max(saldoBaseDisponivel || 0, 0);
  return availableNow < amount || saldoPrincipal < 0;
}

export function estimateRiskDayFromCurrentData(
  today: Date,
  range: { startKey: string; endKey: string },
  initialBalance: number,
  openIncomes: StoredIncome[],
  openExpenses: StoredExpense[]
): Date | null {
  let runningBalance = initialBalance;
  const entries = new Map<string, number>();
  const endDate = rangeEndDate(range.endKey);

  for (const income of openIncomes) {
    const date = parseLocaleDate(income.recebimento);
    if (!date) continue;
    const effectiveDate = date < today ? today : date;
    const key = dateKey(effectiveDate);
    entries.set(key, (entries.get(key) ?? 0) + (income.valor || 0));
  }

  for (const expense of openExpenses) {
    const date = parseLocaleDate(expense.vencimento);
    if (!date) continue;
    const effectiveDate = date < today ? today : date;
    const key = dateKey(effectiveDate);
    entries.set(key, (entries.get(key) ?? 0) - (expense.valor || 0));
  }

  for (let cursor = new Date(today); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    const key = dateKey(cursor);
    const delta = entries.get(key) ?? 0;
    runningBalance += delta;
    if (runningBalance < 0) {
      return new Date(cursor);
    }
  }

  return null;
}

export function resolveInsightShortGoal(primary: InsightEngineItemResponse): string {
  if (primary.family === 'patrimonial') {
    return 'Meta de curto prazo: transformar a folga atual em avanço patrimonial.';
  }
  if (primary.family === 'structural') {
    return 'Meta de curto prazo: reduzir a pressão estrutural das despesas recorrentes.';
  }
  if (primary.family === 'preventive') {
    return 'Meta de curto prazo: atravessar a próxima janela de vencimentos sem apertos.';
  }
  return 'Meta de curto prazo: estabilizar o caixa antes do próximo fechamento.';
}

export function getFinancialGoalLabel(financialGoal: string | null): string | null {
  switch (financialGoal) {
    case 'vida-financeira':
      return 'Melhorar vida financeira';
    case 'sair-dividas':
      return 'Sair das dívidas';
    case 'comecar-investir':
      return 'Começar a investir';
    case 'reserva-emergencia':
      return 'Criar reserva de emergência';
    default:
      return null;
  }
}

export function buildConicGradient(slices: { percent: number; color: string }[]): string {
  if (!slices.length || slices.every((item) => item.percent <= 0)) {
    return 'conic-gradient(var(--surface-inset) 0deg 360deg)';
  }

  let start = 0;
  const parts = slices.map((item) => {
    const end = start + (item.percent / 100) * 360;
    const segment = `${item.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    start = end;
    return segment;
  });

  return `conic-gradient(${parts.join(', ')})`;
}
