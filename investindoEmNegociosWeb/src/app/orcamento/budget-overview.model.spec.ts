import { BudgetItemResponse, BudgetResponse } from '../budget.service';
import { buildBudgetItemView, buildBudgetItemViews, buildBudgetOverview } from './budget-overview.model';

function item(p: Partial<BudgetItemResponse> & { id: string }): BudgetItemResponse {
  return {
    id: p.id,
    categoryName: p.categoryName ?? 'Categoria',
    plannedAmount: p.plannedAmount ?? 0,
    realizedAmount: p.realizedAmount ?? 0,
    variance: p.variance ?? ((p.plannedAmount ?? 0) - (p.realizedAmount ?? 0))
  };
}

function budget(items: BudgetItemResponse[], totals?: Partial<BudgetResponse>): BudgetResponse {
  const totalPlanned = totals?.totalPlanned ?? items.reduce((s, i) => s + i.plannedAmount, 0);
  const totalRealized = totals?.totalRealized ?? items.reduce((s, i) => s + i.realizedAmount, 0);
  return {
    year: 2026, month: 7,
    totalPlanned,
    totalRealized,
    totalVariance: totals?.totalVariance ?? (totalPlanned - totalRealized),
    items
  };
}

describe('budget-overview.model', () => {
  it('calcula uso e tom por item', () => {
    expect(buildBudgetItemView(item({ id: '1', plannedAmount: 100, realizedAmount: 40 })).tone).toBe('ok');
    expect(buildBudgetItemView(item({ id: '2', plannedAmount: 100, realizedAmount: 90 })).tone).toBe('warning');
    const over = buildBudgetItemView(item({ id: '3', plannedAmount: 100, realizedAmount: 130 }));
    expect(over.tone).toBe('critical');
    expect(over.usagePercent).toBe(130);
    expect(over.overBudget).toBeTrue();
  });

  it('trata planejado zero sem dividir por zero', () => {
    const view = buildBudgetItemView(item({ id: '1', plannedAmount: 0, realizedAmount: 50 }));
    expect(view.usagePercent).toBe(0);
    expect(view.tone).toBe('ok');
    expect(view.overBudget).toBeFalse();
  });

  it('consolida totais, uso geral e contagem de estouros', () => {
    const overview = buildBudgetOverview(budget([
      item({ id: '1', plannedAmount: 100, realizedAmount: 120 }), // estourou
      item({ id: '2', plannedAmount: 200, realizedAmount: 80 })
    ]));

    expect(overview.totalPlanned).toBe(300);
    expect(overview.totalRealized).toBe(200);
    expect(overview.usagePercent).toBe(67);
    expect(overview.itemsCount).toBe(2);
    expect(overview.overBudgetCount).toBe(1);
  });

  it('lida com orçamento nulo/vazio', () => {
    expect(buildBudgetItemViews(null)).toEqual([]);
    const overview = buildBudgetOverview(null);
    expect(overview.totalPlanned).toBe(0);
    expect(overview.usagePercent).toBe(0);
    expect(overview.overBudgetCount).toBe(0);
  });
});
