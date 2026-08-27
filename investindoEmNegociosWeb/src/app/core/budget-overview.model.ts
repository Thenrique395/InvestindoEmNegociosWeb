import { BudgetItemResponse, BudgetResponse } from './budget.service';
import { DonutChartItem } from '../shared/donut-chart/donut-chart.component';
import { toneForConsumo } from '../shared/progress-bar/progress-thresholds';
import { TransactionSummaryTone } from '../shared/transactions/transaction-summary-card.component';

/**
 * Derivações puras do orçamento mensal. Não inventa valores: usa planejado e
 * realizado reais vindos do backend.
 */

export interface BudgetItemView {
  item: BudgetItemResponse;
  /** Uso = realizado / planejado (0–100+, sem teto quando estoura). */
  usagePercent: number;
  overBudget: boolean;
}

export interface BudgetOverview {
  totalPlanned: number;
  totalRealized: number;
  totalVariance: number;
  /** Uso geral = realizado / planejado (arredondado). */
  usagePercent: number;
  itemsCount: number;
  overBudgetCount: number;
}

export type BudgetFilter = 'all' | 'attention' | 'overBudget';

export interface BudgetListTotals {
  totalPlanned: number;
  totalRealized: number;
  totalVariance: number;
  usagePercent: number;
}

export interface BudgetPace {
  daysElapsed: number;
  daysInMonth: number;
  idealRealizedToday: number;
  deltaFromPace: number;
  isAbovePace: boolean;
  remainingPerDay: number;
}

export interface BudgetOverrun {
  id: string;
  categoryName: string;
  excessAmount: number;
  detail: string;
}

const COMPOSITION_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)'
];

function usage(realized: number, planned: number): number {
  if (planned <= 0) return 0;
  return Math.round((realized / planned) * 100);
}

export function buildBudgetItemView(item: BudgetItemResponse): BudgetItemView {
  const planned = Number(item.plannedAmount || 0);
  const realized = Number(item.realizedAmount || 0);
  const usagePercent = usage(realized, planned);
  return {
    item,
    usagePercent,
    overBudget: planned > 0 && realized > planned
  };
}

export function buildBudgetItemViews(budget: BudgetResponse | null): BudgetItemView[] {
  return (budget?.items || []).map(buildBudgetItemView);
}

export function filterBudgetItemViews(views: BudgetItemView[], filter: BudgetFilter): BudgetItemView[] {
  switch (filter) {
    case 'attention':
      return views.filter((view) => view.usagePercent > 80);
    case 'overBudget':
      return views.filter((view) => view.overBudget);
    default:
      return views;
  }
}

export function buildBudgetListTotals(views: BudgetItemView[]): BudgetListTotals {
  const totalPlanned = views.reduce((sum, view) => sum + Number(view.item.plannedAmount || 0), 0);
  const totalRealized = views.reduce((sum, view) => sum + Number(view.item.realizedAmount || 0), 0);
  const totalVariance = views.reduce((sum, view) => sum + Number(view.item.variance || 0), 0);
  const usagePercent = usage(totalRealized, totalPlanned);

  return {
    totalPlanned,
    totalRealized,
    totalVariance,
    usagePercent
  };
}

export function buildBudgetPace(budget: BudgetResponse | null, today = new Date()): BudgetPace {
  const year = budget?.year ?? today.getFullYear();
  const month = budget?.month ?? (today.getMonth() + 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const selectedMonthStart = new Date(year, month - 1, 1);
  const selectedMonthEnd = new Date(year, month - 1, daysInMonth);
  let daysElapsed = today.getDate();

  if (today < selectedMonthStart) {
    daysElapsed = 0;
  } else if (today > selectedMonthEnd) {
    daysElapsed = daysInMonth;
  }

  daysElapsed = Math.min(Math.max(daysElapsed, 0), daysInMonth);

  const totalPlanned = Number(budget?.totalPlanned || 0);
  const totalRealized = Number(budget?.totalRealized || 0);
  const idealRealizedToday = totalPlanned * (daysElapsed / daysInMonth);
  const deltaFromPace = totalRealized - idealRealizedToday;
  const daysRemaining = Math.max(daysInMonth - daysElapsed, 1);

  return {
    daysElapsed,
    daysInMonth,
    idealRealizedToday,
    deltaFromPace,
    isAbovePace: deltaFromPace > 0,
    remainingPerDay: Math.max(totalPlanned - totalRealized, 0) / daysRemaining
  };
}

export function buildBudgetComposition(views: BudgetItemView[]): DonutChartItem[] {
  const plannedItems = views.filter((view) => Number(view.item.plannedAmount || 0) > 0);
  const totalPlanned = plannedItems.reduce((sum, view) => sum + Number(view.item.plannedAmount || 0), 0);
  if (totalPlanned <= 0) return [];

  return plannedItems.map((view, index) => {
    const value = Number(view.item.plannedAmount || 0);
    return {
      label: view.item.categoryName,
      value,
      percent: (value / totalPlanned) * 100,
      color: COMPOSITION_COLORS[index % COMPOSITION_COLORS.length]
    };
  });
}

export function buildBudgetOverruns(views: BudgetItemView[]): BudgetOverrun[] {
  return views
    .filter((view) => view.overBudget)
    .map((view) => {
      const planned = Number(view.item.plannedAmount || 0);
      const realized = Number(view.item.realizedAmount || 0);
      const excessAmount = Math.max(realized - planned, 0);
      return {
        id: view.item.id,
        categoryName: view.item.categoryName,
        excessAmount,
        detail: `${usage(realized, planned)}% do planejado`
      };
    })
    .sort((a, b) => b.excessAmount - a.excessAmount);
}

export function buildBudgetOverview(budget: BudgetResponse | null): BudgetOverview {
  const items = budget?.items || [];
  const totalPlanned = Number(budget?.totalPlanned || 0);
  const totalRealized = Number(budget?.totalRealized || 0);
  const overBudgetCount = items.filter((i) => Number(i.plannedAmount || 0) > 0 && Number(i.realizedAmount || 0) > Number(i.plannedAmount || 0)).length;

  return {
    totalPlanned,
    totalRealized,
    totalVariance: Number(budget?.totalVariance ?? (totalPlanned - totalRealized)),
    usagePercent: usage(totalRealized, totalPlanned),
    itemsCount: items.length,
    overBudgetCount
  };
}

/**
 * Tom do CARD de indicador "Uso do orçamento". Reaproveita o limiar de consumo do
 * primitivo em vez de repetir `> 100 ? ... : > 80 ? ...` no template — era a quarta
 * cópia dos mesmos números (ARQUITETURA_ANGULAR.md §9.1).
 */
export function budgetUsageCardTone(usagePercent: number): TransactionSummaryTone {
  const tone = toneForConsumo(usagePercent);
  if (tone === 'expense') return 'danger';
  if (tone === 'warning') return 'warning';
  return 'success';
}
