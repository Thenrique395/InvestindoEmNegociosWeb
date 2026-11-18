import type { StoredExpense } from '../../core/data/api-data.service';
import type { DisplayInstallmentStatus } from '../../core/utils/status';
import { resolveInstallmentStatus, expenseStatusLabel } from '../../core/utils/status';
import { parseLocaleDate } from '../../core/utils/locale-utils';
import { collate as collateText, compareLocaleDate } from '../../shared/transactions/transaction-helpers';
import { isExpenseOpen } from '../../core/utils/home-insight.utils';

export type ExpenseSort = 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | 'status';
export interface ExpenseFilters {
  status: 'ALL' | DisplayInstallmentStatus;
  category: string;
  name: string;
  sortBy: ExpenseSort | null;
  sortDir: 1 | -1;
}
export function matchesExpenseCategory(expense: StoredExpense, category: string): boolean {
  return category === 'ALL' || expense.categoryId === category;
}
export function matchesExpenseName(expense: StoredExpense, name: string): boolean {
  return !name || (expense.nome || '').toLowerCase().includes(name.toLowerCase());
}
export function matchesExpenseStatus(expense: StoredExpense, status: ExpenseFilters['status']): boolean {
  return status === 'ALL' || resolveInstallmentStatus(expense.status, expense.vencimento) === status;
}
/** Filtering creates a new array; sorting must never reorder the source store. */
export function filterExpenseEntries(
  expenses: readonly StoredExpense[],
  filters: ExpenseFilters,
  paymentLabel: (expense: StoredExpense) => string
): StoredExpense[] {
  const base = expenses.filter((d) => {
    return matchesExpenseStatus(d, filters.status) && matchesExpenseCategory(d, filters.category) && matchesExpenseName(d, filters.name);
  });
  if (!filters.sortBy) return base;
  const compare = (a: StoredExpense, b: StoredExpense) => {
    switch (filters.sortBy) {
      case 'nome':
        return collateText(a.nome, b.nome);
      case 'categoria':
        return collateText(a.categoria, b.categoria);
      case 'pagamento':
        return collateText(paymentLabel(a), paymentLabel(b));
      case 'vencimento':
        return compareLocaleDate(a.vencimento, b.vencimento);
      case 'valor':
        return (a.valor || 0) - (b.valor || 0);
      case 'status':
        return collateText(expenseStatusLabel(a.status), expenseStatusLabel(b.status));
      default:
        return 0;
    }
  };
  return base.sort((a, b) => compare(a, b) * filters.sortDir);
}
export function selectedExpenseIds(visible: readonly StoredExpense[], selectedIds: ReadonlySet<string>): string[] {
  const visiveisSelecionaveis = new Set(
    visible
      .filter((d) => d.status !== 'PAID' && d.status !== 'CANCELED')
      .map((d) => d.id)
      .filter((id): id is string => !!id)
  );
  return Array.from(selectedIds).filter((id) => visiveisSelecionaveis.has(id));
}
export function anticipatableExpenses(
  expenses: readonly StoredExpense[],
  selectedIds: readonly string[],
  reference: Date
): StoredExpense[] {
  // Regra: pode antecipar apenas se o vencimento for em mês futuro em relação à data de hoje
  const hoje = reference;
  const mesHoje = hoje.getMonth();
  const anoHoje = hoje.getFullYear();
  const selecionados = new Set(selectedIds);
  return expenses.filter((d) => {
    if (!selecionados.has(d.id)) return false;
    if (d.status === 'PAID' || d.status === 'CANCELED' || d.status === 'ANTICIPATED') return false;
    const data = parseLocaleDate(d.vencimento || '');
    if (!data) return false;
    // Vencimento precisa ser depois do mês atual (hoje) para ser elegível
    return data.getFullYear() > anoHoje || (data.getFullYear() === anoHoje && data.getMonth() > mesHoje);
  });
}
export function expenseMonthComparison(prevTotal: number, currentTotal: number, monthLabel: string) {
  if (prevTotal === 0 && currentTotal === 0) return null;
  const delta = currentTotal - prevTotal;
  const trend: 'up' | 'down' | 'flat' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const isNew = prevTotal === 0 && currentTotal > 0;
  const percent = prevTotal === 0 ? (currentTotal ? 100 : 0) : (delta / prevTotal) * 100;
  return {
    month: monthLabel,
    delta,
    deltaAbs: Math.abs(delta),
    percent,
    trend,
    isNew
  };
}
export function expenseTotal(expenses: readonly StoredExpense[], kind: 'pending' | 'anticipated' | 'paid'): number {
  return expenses.reduce((sum, item) => {
    const include = kind === 'pending' ? isExpenseOpen(item.status)
      : item.status === (kind === 'anticipated' ? 'ANTICIPATED' : 'PAID');
    return include ? sum + (item.valor || 0) : sum;
  }, 0);
}
