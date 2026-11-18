import type { StoredExpense, StoredIncome } from '../../core/data/api-data.service';
import { monthKeyFromLocaleDate, parseLocaleDate } from '../../core/utils/locale-utils';
import { isExpenseOpen, isIncomeReceived } from '../../core/utils/home-insight.utils';

export type DashboardRecurrenceItem = {
  id: string;
  title: string;
  amount: number;
  dateLabel: string;
  kindLabel: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'muted';
  direction: 'income' | 'expense';
};

export function isRecurringExpense(expense: StoredExpense): boolean {
  return !!expense.fixa || !!expense.serieId || (!!expense.parcelasTotal && expense.parcelasTotal > 1);
}
function recurringExpenseKindLabel(expense: StoredExpense): string {
  const category = (expense.categoria || '').toLowerCase();
  if (category.includes('assinatura')) return 'Assinatura';
  if (expense.parcelasTotal && expense.parcelasTotal > 1) {
    return `Parcela ${expense.parcelaNumero || 1}/${expense.parcelasTotal}`;
  }
  return 'Conta fixa';
}
export function formatCompactLocaleDate(value: string): string {
  const parsed = parseLocaleDate(value);
  return parsed ? parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : value;
}
export function buildDashboardRecurrences(
  expenses: readonly StoredExpense[],
  incomes: readonly StoredIncome[],
  reference: Date
): DashboardRecurrenceItem[] {
  const currentMonthKey = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, '0')}`;
  const expenseItems: DashboardRecurrenceItem[] = expenses
    .filter((expense) => monthKeyFromLocaleDate(expense.vencimento) === currentMonthKey)
    .filter((expense) => isRecurringExpense(expense))
    .map((expense): DashboardRecurrenceItem => ({
      id: `expense-${expense.id}`,
      title: expense.nome || 'Despesa recorrente',
      amount: expense.valor || 0,
      dateLabel: formatCompactLocaleDate(expense.vencimento),
      kindLabel: recurringExpenseKindLabel(expense),
      tone: isExpenseOpen(expense.status) ? 'warning' : 'muted',
      direction: 'expense' as const
    }));
  const incomeItems: DashboardRecurrenceItem[] = incomes
    .filter((income) => monthKeyFromLocaleDate(income.recebimento) === currentMonthKey)
    .filter((income) => !!income.fixa)
    .map((income): DashboardRecurrenceItem => ({
      id: `income-${income.id}`,
      title: income.fonte || 'Receita recorrente',
      amount: income.valor || 0,
      dateLabel: formatCompactLocaleDate(income.recebimento),
      kindLabel: 'Receita fixa',
      tone: isIncomeReceived(income.status) ? 'success' : 'info',
      direction: 'income' as const
    }));

  return [...expenseItems, ...incomeItems]
    .sort((a, b) => {
      const directionOrder = a.direction === b.direction ? 0 : a.direction === 'expense' ? -1 : 1;
      if (directionOrder !== 0) return directionOrder;
      return b.amount - a.amount;
    });
}
