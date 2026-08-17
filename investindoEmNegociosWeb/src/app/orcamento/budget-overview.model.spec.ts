import { BudgetItemResponse, BudgetResponse } from '../budget.service';
import { buildBudgetComposition, buildBudgetItemView, buildBudgetItemViews, buildBudgetListTotals, buildBudgetOverruns, buildBudgetOverview, buildBudgetPace, filterBudgetItemViews , budgetUsageCardTone } from './budget-overview.model';

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
    items,
    ...totals
  };
}

describe('budget-overview.model', () => {
  it('calcula uso por item', () => {
    // O TOM saiu daqui: quem decide a cor é o limiar de consumo do app-progress-bar
    // (ARQUITETURA_ANGULAR.md §9.1). O modelo só entrega o percentual e o estouro.
    expect(buildBudgetItemView(item({ id: '1', plannedAmount: 100, realizedAmount: 40 })).usagePercent).toBe(40);
    expect(buildBudgetItemView(item({ id: '2', plannedAmount: 100, realizedAmount: 90 })).usagePercent).toBe(90);
    const over = buildBudgetItemView(item({ id: '3', plannedAmount: 100, realizedAmount: 130 }));
    expect(over.usagePercent).toBe(130);
    expect(over.overBudget).toBeTrue();
  });

  it('deriva o tom do card de uso a partir do limiar compartilhado', () => {
    expect(budgetUsageCardTone(40)).toBe('success');
    expect(budgetUsageCardTone(80)).toBe('warning');
    expect(budgetUsageCardTone(101)).toBe('danger');
  });

  it('trata planejado zero sem dividir por zero', () => {
    const view = buildBudgetItemView(item({ id: '1', plannedAmount: 0, realizedAmount: 50 }));
    expect(view.usagePercent).toBe(0);
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

  it('filtra categorias em atenção e estouradas', () => {
    const views = buildBudgetItemViews(budget([
      item({ id: 'ok', plannedAmount: 100, realizedAmount: 40 }),
      item({ id: 'warn', plannedAmount: 100, realizedAmount: 90 }),
      item({ id: 'over', plannedAmount: 100, realizedAmount: 130 })
    ]));

    expect(filterBudgetItemViews(views, 'all').map((view) => view.item.id)).toEqual(['ok', 'warn', 'over']);
    expect(filterBudgetItemViews(views, 'attention').map((view) => view.item.id)).toEqual(['warn', 'over']);
    expect(filterBudgetItemViews(views, 'overBudget').map((view) => view.item.id)).toEqual(['over']);
  });

  it('calcula o total da lista exibida', () => {
    const totals = buildBudgetListTotals(buildBudgetItemViews(budget([
      item({ id: 'warn', plannedAmount: 100, realizedAmount: 90, variance: 10 }),
      item({ id: 'over', plannedAmount: 200, realizedAmount: 250, variance: -50 })
    ])));

    expect(totals.totalPlanned).toBe(300);
    expect(totals.totalRealized).toBe(340);
    expect(totals.totalVariance).toBe(-40);
    expect(totals.usagePercent).toBe(113);
  });

  it('calcula ritmo proporcional ao dia do mês', () => {
    const pace = buildBudgetPace(budget([
      item({ id: 'a', plannedAmount: 3100, realizedAmount: 1600 })
    ], {
      year: 2026,
      month: 8,
      totalPlanned: 3100,
      totalRealized: 1600
    }), new Date(2026, 7, 14));

    expect(pace.daysElapsed).toBe(14);
    expect(pace.daysInMonth).toBe(31);
    expect(Math.round(pace.idealRealizedToday)).toBe(1400);
    expect(Math.round(pace.deltaFromPace)).toBe(200);
    expect(pace.isAbovePace).toBeTrue();
    expect(Math.round(pace.remainingPerDay)).toBe(88);
  });

  it('monta composição planejada e estouros ordenados por excedente', () => {
    const views = buildBudgetItemViews(budget([
      item({ id: 'food', categoryName: 'Alimentação', plannedAmount: 1000, realizedAmount: 1300 }),
      item({ id: 'home', categoryName: 'Moradia', plannedAmount: 3000, realizedAmount: 3100 }),
      item({ id: 'zero', categoryName: 'Sem plano', plannedAmount: 0, realizedAmount: 10 })
    ]));

    const composition = buildBudgetComposition(views);
    const overruns = buildBudgetOverruns(views);

    expect(composition.map((entry) => entry.label)).toEqual(['Alimentação', 'Moradia']);
    expect(composition.map((entry) => Math.round(entry.percent))).toEqual([25, 75]);
    expect(overruns.map((entry) => entry.categoryName)).toEqual(['Alimentação', 'Moradia']);
    expect(overruns[0].excessAmount).toBe(300);
    expect(overruns[0].detail).toBe('130% do planejado');
  });
});
