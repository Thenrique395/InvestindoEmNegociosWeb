import { of, throwError } from 'rxjs';
import { OrcamentoComponent } from './orcamento.component';
import { BudgetItemResponse, BudgetResponse } from '../../core/budget.service';

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
  const categoriesService = {
    list: jasmine.createSpy('list').and.returnValue(of([
      { id: 'cat-1', name: 'Moradia', appliesTo: 'Expense', isDefault: true, isActive: true }
    ]))
  };
  const uiFeedback = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    info: jasmine.createSpy('info')
  } as any;
  const cdr = { markForCheck: jasmine.createSpy('markForCheck') } as any;
  const destroyRef = { onDestroy: () => {} } as any;
  return { component: new OrcamentoComponent(budgetService, categoriesService as any, uiFeedback, cdr, destroyRef), budgetService, categoriesService, uiFeedback };
}

describe('OrcamentoComponent', () => {
  it('carrega o orçamento do mês ao iniciar', () => {
    const { component, budgetService, categoriesService } = createComponent();

    component.ngOnInit();

    expect(budgetService.get).toHaveBeenCalledWith(component.year, component.month);
    expect(categoriesService.list).toHaveBeenCalledWith('Expense');
    expect(component.budget()?.totalPlanned).toBe(1000);
    expect(component.categories().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('sinaliza erro quando o carregamento falha', () => {
    const { component, budgetService } = createComponent();
    budgetService.get.and.returnValue(throwError(() => ({ error: { detail: 'boom' } })));

    component.ngOnInit();

    expect(component.budget()).toBeNull();
    expect(component.error()).toBe('boom');
    expect(component.loading()).toBeFalse();
  });

  it('deriva overview com uso geral e estouros', () => {
    const { component } = createComponent();
    component.budget.set(budget({
      totalPlanned: 300, totalRealized: 200, totalVariance: 100,
      items: [
        item({ id: 'a', plannedAmount: 100, realizedAmount: 120 }),
        item({ id: 'b', plannedAmount: 200, realizedAmount: 80 })
      ]
    }));

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

  it('adiciona categoria pelo modal usando a categoria selecionada', () => {
    const { component, budgetService, uiFeedback } = createComponent();
    component.categories.set([{ id: 'cat-1', name: 'Mercado', appliesTo: 'Expense', isDefault: true, isActive: true }]);
    component.selectedCategoryId = 'cat-1';
    component.newAmount = 700;
    component.showAddModal.set(true);

    component.addItem();

    expect(budgetService.upsertItems).toHaveBeenCalledWith(component.year, component.month, [{ categoryName: 'Mercado', plannedAmount: 700 }]);
    expect(component.showAddModal()).toBeFalse();
    expect(uiFeedback.success).toHaveBeenCalled();
  });

  it('copia categorias planejadas do mês anterior para o mês atual', () => {
    const { component, budgetService, uiFeedback } = createComponent();
    component.year = 2026;
    component.month = 8;
    budgetService.get.and.returnValue(of(budget({
      year: 2026,
      month: 7,
      items: [
        item({ id: 'prev-1', categoryName: 'Moradia', plannedAmount: 1200, realizedAmount: 900 }),
        item({ id: 'prev-2', categoryName: 'Transporte', plannedAmount: 300, realizedAmount: 100 })
      ]
    })));
    budgetService.upsertItems.and.returnValue(of(budget({
      totalPlanned: 1500,
      items: [
        item({ id: 'new-1', categoryName: 'Moradia', plannedAmount: 1200 }),
        item({ id: 'new-2', categoryName: 'Transporte', plannedAmount: 300 })
      ]
    })));

    component.copyPreviousMonth();

    expect(budgetService.get).toHaveBeenCalledWith(2026, 7);
    expect(budgetService.upsertItems).toHaveBeenCalledWith(2026, 8, [
      { categoryName: 'Moradia', plannedAmount: 1200 },
      { categoryName: 'Transporte', plannedAmount: 300 }
    ]);
    expect(component.budget()?.totalPlanned).toBe(1500);
    expect(component.copyingPrevious()).toBeFalse();
    expect(uiFeedback.success).toHaveBeenCalledWith('Orçamento do mês anterior copiado.');
  });

  it('informa quando o mês anterior não possui categorias para copiar', () => {
    const { component, budgetService, uiFeedback } = createComponent();
    component.year = 2026;
    component.month = 1;
    budgetService.get.and.returnValue(of(budget({ year: 2025, month: 12, items: [] })));

    component.copyPreviousMonth();

    expect(budgetService.get).toHaveBeenCalledWith(2025, 12);
    expect(budgetService.upsertItems).not.toHaveBeenCalled();
    expect(component.copyingPrevious()).toBeFalse();
    expect(uiFeedback.info).toHaveBeenCalledWith('O mês anterior não possui categorias planejadas para copiar.');
  });

  it('remove item apenas após confirmação', () => {
    const { component, budgetService } = createComponent();
    component.budget.set(budget({ items: [item({ id: 'i1' }), item({ id: 'i2' })] }));
    const target = component.budget()!.items[0];

    component.askRemove(target);
    expect(component.pendingDelete?.id).toBe('i1');
    expect(budgetService.deleteItem).not.toHaveBeenCalled();

    component.confirmRemove();

    expect(budgetService.deleteItem).toHaveBeenCalledWith('i1');
    expect(component.budget()?.items.map((i) => i.id)).toEqual(['i2']);
    expect(component.pendingDelete).toBeNull();
  });

  it('cancelRemove descarta sem excluir', () => {
    const { component, budgetService } = createComponent();
    component.budget.set(budget());
    component.askRemove(component.budget()!.items[0]);

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
