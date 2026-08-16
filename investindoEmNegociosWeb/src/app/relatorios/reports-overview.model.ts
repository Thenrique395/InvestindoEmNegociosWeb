import { CategoryExpenseResponse, MonthlySummaryReportResponse } from '../reports.service';

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

export type ReportComparisonPeriod = 6 | 12;

export interface ReportMonthRef {
  year: number;
  month: number;
  label: string;
}

export interface ReportComparisonPoint extends ReportMonthRef {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomePercent: number;
  expensePercent: number;
  balancePercent: number;
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

export function buildComparisonWindow(
  year: number,
  month: number,
  period: ReportComparisonPeriod,
  monthNames: readonly string[]
): ReportMonthRef[] {
  return Array.from({ length: period }, (_, index) => {
    const offset = index - period + 1;
    const absoluteMonth = year * 12 + (month - 1) + offset;
    const targetYear = Math.floor(absoluteMonth / 12);
    const targetMonth = (absoluteMonth % 12) + 1;
    const name = monthNames[targetMonth - 1] || String(targetMonth).padStart(2, '0');

    return {
      year: targetYear,
      month: targetMonth,
      label: `${name.slice(0, 3)} ${String(targetYear).slice(-2)}`
    };
  });
}

export function buildReportComparison(
  reports: MonthlySummaryReportResponse[] | null | undefined,
  monthRefs: readonly ReportMonthRef[]
): ReportComparisonPoint[] {
  const byMonth = new Map(
    (reports || []).map((report) => [`${report.year}-${report.month}`, report])
  );
  const maxMovement = Math.max(
    1,
    ...monthRefs.flatMap((ref) => {
      const report = byMonth.get(`${ref.year}-${ref.month}`);
      return report ? [Number(report.totalIncome || 0), Number(report.totalExpenses || 0)] : [0];
    })
  );
  const maxBalance = Math.max(
    1,
    ...monthRefs.map((ref) => Math.abs(Number(byMonth.get(`${ref.year}-${ref.month}`)?.netBalance || 0)))
  );

  return monthRefs.map((ref) => {
    const report = byMonth.get(`${ref.year}-${ref.month}`);
    const totalIncome = Number(report?.totalIncome || 0);
    const totalExpenses = Number(report?.totalExpenses || 0);
    const netBalance = Number(report?.netBalance || 0);

    return {
      ...ref,
      totalIncome,
      totalExpenses,
      netBalance,
      incomePercent: Math.max(0, Math.min(100, (totalIncome / maxMovement) * 100)),
      expensePercent: Math.max(0, Math.min(100, (totalExpenses / maxMovement) * 100)),
      balancePercent: Math.max(0, Math.min(100, (Math.abs(netBalance) / maxBalance) * 100))
    };
  });
}
