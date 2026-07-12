import { BudgetItemResponse, BudgetResponse } from '../budget.service';
import { UsageBarTone } from '../shared/usage-bar/usage-bar.component';

/**
 * Derivações puras do orçamento mensal. Não inventa valores: usa planejado e
 * realizado reais vindos do backend.
 */

export interface BudgetItemView {
  item: BudgetItemResponse;
  /** Uso = realizado / planejado (0–100+, sem teto quando estoura). */
  usagePercent: number;
  tone: UsageBarTone;
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

function usage(realized: number, planned: number): number {
  if (planned <= 0) return 0;
  return Math.round((realized / planned) * 100);
}

function toneFor(percent: number): UsageBarTone {
  if (percent > 100) return 'critical';
  if (percent > 80) return 'warning';
  return 'ok';
}

export function buildBudgetItemView(item: BudgetItemResponse): BudgetItemView {
  const planned = Number(item.plannedAmount || 0);
  const realized = Number(item.realizedAmount || 0);
  const usagePercent = usage(realized, planned);
  return {
    item,
    usagePercent,
    tone: toneFor(usagePercent),
    overBudget: planned > 0 && realized > planned
  };
}

export function buildBudgetItemViews(budget: BudgetResponse | null): BudgetItemView[] {
  return (budget?.items || []).map(buildBudgetItemView);
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
