import type { StoredExpense, StoredIncome } from '../../core/data/api-data.service';
import { monthKeyFromLocaleDate } from '../../core/utils/locale-utils';
import { isExpenseOpen, isIncomePending, isIncomeReceived } from '../../core/utils/home-insight.utils';

export interface DashboardPeriodRange { startKey: string; endKey: string; }
export type DashboardPeriod = 'month' | 'quarter' | 'year';
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export function dashboardPeriodRange(reference: Date, period: DashboardPeriod): DashboardPeriodRange {
  const year = reference.getFullYear();
  if (period === 'year') return { startKey: `${year}-01`, endKey: `${year}-12` };
  if (period === 'quarter') {
    const start = Math.floor(reference.getMonth() / 3) * 3;
    return { startKey: monthKey(new Date(year, start, 1)), endKey: monthKey(new Date(year, start + 2, 1)) };
  }
  return { startKey: monthKey(reference), endKey: monthKey(reference) };
}

export function previousDashboardPeriodRange(reference: Date, period: DashboardPeriod): DashboardPeriodRange {
  if (period === 'year') return dashboardPeriodRange(new Date(reference.getFullYear() - 1, 0, 1), period);
  const offset = period === 'quarter' ? 3 : 1;
  const start = period === 'quarter' ? Math.floor(reference.getMonth() / 3) * 3 : reference.getMonth();
  return dashboardPeriodRange(new Date(reference.getFullYear(), start - offset, 1), period);
}

export function dateInDashboardPeriod(value: string, range: DashboardPeriodRange): boolean {
  const key = monthKeyFromLocaleDate(value);
  return !!key && key >= range.startKey && key <= range.endKey;
}

export function sumDashboardExpenses(
  items: readonly StoredExpense[],
  range: DashboardPeriodRange,
  kind: 'all' | 'open' | 'settled' = 'all'
): number {
  return items.filter(item => dateInDashboardPeriod(item.vencimento, range)
    && (kind === 'all' || (kind === 'open' ? isExpenseOpen(item.status) : !isExpenseOpen(item.status))))
    .reduce((sum, item) => sum + (item.valor || 0), 0);
}

export function sumDashboardIncomes(
  items: readonly StoredIncome[],
  range: DashboardPeriodRange,
  kind: 'received' | 'pending' = 'received'
): number {
  return items.filter(item => dateInDashboardPeriod(item.recebimento, range)
    && (kind === 'received' ? isIncomeReceived(item.status) : isIncomePending(item.status)))
    .reduce((sum, item) => sum + (item.valor || 0), 0);
}

/** Preserva o saldo histórico calculado pela tela; não substitui o saldo contábil da API. */
export function dashboardBalanceBefore(
  expenses: readonly StoredExpense[],
  incomes: readonly StoredIncome[],
  range: DashboardPeriodRange
): number {
  const before = (value: string) => {
    const key = monthKeyFromLocaleDate(value);
    return !!key && key < range.startKey;
  };
  return incomes.filter(item => before(item.recebimento) && isIncomeReceived(item.status))
    .reduce((sum, item) => sum + (item.valor || 0), 0)
    - expenses.filter(item => before(item.vencimento)).reduce((sum, item) => sum + (item.valor || 0), 0);
}
