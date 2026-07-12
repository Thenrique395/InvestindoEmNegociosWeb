import { of, throwError } from 'rxjs';
import { OrcamentoComponent } from './orcamento.component';
import { BudgetItemResponse, BudgetResponse } from '../budget.service';

function item(p: Partial<BudgetItemResponse> & { id: string }): BudgetItemResponse {
  return {
    id: p.id,
    categoryName: p.categoryName ?? 'Moradia',
    plannedAmount: p.plannedAmount ?? 1000,
    realizedAmount: p.realizedAmount ?? 400,
    variance: p.variance ?? 600
  };
}

function budget(overrides: Partial<BudgetResponse> = {}): BudgetResponse {
  return {
    year: 2026, month: 7,
    totalPlanned: 1000, totalRealized: 400, totalVariance: 600,
    items: [item({ id: 'i1' })],
    ...overrides
  };
}

function createComponent(overrides?: { budgetService?: any }) {
  const budgetService = overrides?.budgetService ?? {
    get: jasmine.createSpy('get').and.returnValue(of(budget())),
    upsertItems: jasmine.createSpy('upsertItems').and.returnValue(of(budget())),
    deleteItem: jasmine.createSpy('deleteItem').and.returnValue(of(void 0))
  };
  const uiFeedback = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') } as any;
  const cdr = { markForCheck: jasmine.createSpy('markForCheck') } as any;
  const destroyRef = { onDestroy: () => {} } as any;
  return { component: new OrcamentoComponent(budgetService, uiFeedback, cdr, destroyRef), budgetService, uiFeedback };
}

describe('OrcamentoComponent', () => {
  it('carrega o orçamento do mês ao iniciar', () => {
    const { component, budgetService } = createComponent();

    component.ngOnInit();

    expect(budgetService.get).toHaveBeenCalledWith(component.year, component.month);
    expect(component.budget?.totalPlanned).toBe(1000);
    expect(component.loading).toBeFalse();
  });

  it('sinaliza erro quando o carregamento falha', () => {
    const { component, budgetService } = createComponent();
    budgetService.get.and.returnValue(throwError(() => ({ error: { detail: 'boom' } })));

    component.ngOnInit();

    expect(component.budget).toBeNull();
    expect(component.error).toBe('boom');
    expect(component.loading).toBeFalse();
  });

  it('deriva overview com uso geral e estouros', () => {
    const { component } = createComponent();
    component.budget = budget({
      totalPlanned: 300, totalRealized: 200, totalVariance: 100,
      items: [
        item({ id: 'a', plannedAmount: 100, realizedAmount: 120 }),
        item({ id: 'b', plannedAmount: 200, realizedAmount: 80 })
      ]
    });

    expect(component.overview.usagePercent).toBe(67);
    expect(component.overview.overBudgetCount).toBe(1);
    expect(component.itemViews.length).toBe(2);
  });

  it('não salva edição quando o valor não muda', () => {
    const { component, budgetService } = createComponent();
    const it = item({ id: 'i1', plannedAmount: 1000 });
    component.startEdit(it);
    component.editingAmount = 1000;

    component.confirmEdit(it);

    expect(budgetService.upsertItems).not.toHaveBeenCalled();
    expect(component.editingId).toBeNull();
  });

  it('salva edição do valor planejado', () => {
    const { component, budgetService, uiFeedback } = createComponent();
    const it = item({ id: 'i1', plannedAmount: 1000, categoryName: 'Moradia' });
    component.startEdit(it);
    component.editingAmount = 1500;

    component.confirmEdit(it);

    expect(budgetService.upsertItems).toHaveBeenCalledWith(component.year, component.month, [{ categoryName: 'Moradia', plannedAmount: 1500 }]);
    expect(component.editingId).toBeNull();
    expect(uiFeedback.success).toHaveBeenCalled();
  });

  it('remove item apenas após confirmação', () => {
    const { component, budgetService } = createComponent();
    component.budget = budget({ items: [item({ id: 'i1' }), item({ id: 'i2' })] });
    const target = component.budget.items[0];

    component.askRemove(target);
    expect(component.pendingDelete?.id).toBe('i1');
    expect(budgetService.deleteItem).not.toHaveBeenCalled();

    component.confirmRemove();

    expect(budgetService.deleteItem).toHaveBeenCalledWith('i1');
    expect(component.budget?.items.map((i) => i.id)).toEqual(['i2']);
    expect(component.pendingDelete).toBeNull();
  });

  it('cancelRemove descarta sem excluir', () => {
    const { component, budgetService } = createComponent();
    component.budget = budget();
    component.askRemove(component.budget.items[0]);

    component.cancelRemove();

    expect(component.pendingDelete).toBeNull();
    expect(budgetService.deleteItem).not.toHaveBeenCalled();
  });

  it('avança e volta o mês recarregando', () => {
    const { component, budgetService } = createComponent();
    component.year = 2026; component.month = 12;

    component.nextMonth();

    expect(component.month).toBe(1);
    expect(component.year).toBe(2027);
    expect(budgetService.get).toHaveBeenCalledWith(2027, 1);
  });
});
