import { CategoryExpenseResponse } from '../reports.service';

/**
 * Derivações puras do relatório mensal. Não inventa valores: tudo vem do
 * response real (`MonthlySummaryReportResponse`).
 */

export const CATEGORY_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)'
];

export interface CategoryExpenseBar {
  categoryName: string;
  amount: number;
  percentageOfTotal: number;
  color: string;
}

/** Monta barras de despesas por categoria, conforme handoff: lista longa lê melhor em barra. */
export function buildExpenseCategoryBars(categories: CategoryExpenseResponse[] | null | undefined): CategoryExpenseBar[] {
  return (categories || []).map((cat, index) => ({
    categoryName: cat.categoryName,
    amount: cat.amount,
    percentageOfTotal: Math.max(0, Math.min(100, Number(cat.percentageOfTotal || 0))),
    color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]
  }));
}

/**
 * Maiores despesas do período (dado real de `topExpenses`), ordenadas por valor
 * decrescente e limitadas. Descarta valores não positivos.
 */
export function buildTopExpenses(
  topExpenses: CategoryExpenseResponse[] | null | undefined,
  limit = 5
): CategoryExpenseResponse[] {
  return (topExpenses || [])
    .filter((cat) => Number(cat.amount || 0) > 0)
    .slice()
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, Math.max(0, limit));
}
