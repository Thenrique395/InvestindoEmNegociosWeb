import { CategoryExpenseResponse } from '../reports.service';
import { DonutChartItem } from '../shared/donut-chart/donut-chart.component';

/**
 * Derivações puras do relatório mensal. Não inventa valores: tudo vem do
 * response real (`MonthlySummaryReportResponse`).
 */

export const CATEGORY_PALETTE = [
  'var(--color-chart-series-1)',
  'var(--color-chart-series-2)',
  'var(--color-chart-series-3)',
  'var(--color-chart-series-4)',
  'var(--color-chart-series-5)'
];

/** Monta os itens do donut de despesas por categoria com a cor da paleta. */
export function buildExpenseDonutItems(categories: CategoryExpenseResponse[] | null | undefined): DonutChartItem[] {
  return (categories || []).map((cat, index) => ({
    label: cat.categoryName,
    value: cat.amount,
    percent: cat.percentageOfTotal,
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
