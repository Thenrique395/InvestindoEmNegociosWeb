import { StoredExpense, StoredIncome } from '../data/api-data.service';
import { formatMonthLabelFromKey } from './locale-utils';
import { monthKeyFromLocaleDate } from './locale-utils';
import { isIncomeReceived } from './home-insight.utils';

export interface MonthlyFlowPoint {
  key: string; // AAAA-MM
  label: string; // mês abreviado (ex.: "jan.")
  income: number;
  expense: number;
  balance: number;
}

/**
 * Série mensal de fluxo (entradas × saídas × resultado) terminando no mês de
 * referência. Espelha as mesmas regras dos KPIs do dashboard: receitas contam
 * apenas as recebidas (por mês de recebimento) e despesas contam por mês de
 * vencimento.
 */
export function buildMonthlyFlowSeries(
  expenses: Pick<StoredExpense, 'valor' | 'vencimento'>[],
  incomes: Pick<StoredIncome, 'valor' | 'recebimento' | 'status'>[],
  reference: Date,
  monthsCount: number
): MonthlyFlowPoint[] {
  const keys: string[] = [];
  for (let offset = monthsCount - 1; offset >= 0; offset--) {
    const date = new Date(reference.getFullYear(), reference.getMonth() - offset, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  const expenseByKey = new Map<string, number>();
  for (const expense of expenses) {
    const key = monthKeyFromLocaleDate(expense.vencimento);
    if (!key) continue;
    expenseByKey.set(key, (expenseByKey.get(key) || 0) + (expense.valor || 0));
  }

  const incomeByKey = new Map<string, number>();
  for (const income of incomes) {
    if (!isIncomeReceived(income.status)) continue;
    const key = monthKeyFromLocaleDate(income.recebimento);
    if (!key) continue;
    incomeByKey.set(key, (incomeByKey.get(key) || 0) + (income.valor || 0));
  }

  return keys.map((key) => {
    const income = incomeByKey.get(key) || 0;
    const expense = expenseByKey.get(key) || 0;
    return {
      key,
      label: formatMonthLabelFromKey(key, 'short'),
      income,
      expense,
      balance: income - expense
    };
  });
}
