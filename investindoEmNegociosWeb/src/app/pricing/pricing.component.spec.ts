import { PricingComponent } from './pricing.component';

class TitleMock {
  current = '';
  setTitle = jasmine.createSpy('setTitle').and.callFake((value: string) => {
    this.current = value;
  });
}

class MetaMock {
  updateTag = jasmine.createSpy('updateTag');
}

function createComponent() {
  const title = new TitleMock();
  const meta = new MetaMock();
  const component = new PricingComponent(title as any, meta as any);
  return { component, title, meta };
}

describe('PricingComponent', () => {
  it('inicia com a periodicidade mensal', () => {
    const { component } = createComponent();
    expect(component.cycle).toBe('Monthly');
  });

  it('troca a periodicidade selecionada', () => {
    const { component } = createComponent();
    component.selectCycle('Yearly');
    expect(component.cycle).toBe('Yearly');
  });

  it('calcula o equivalente mensal do preço anual', () => {
    const { component } = createComponent();
    expect(component.yearlyEquivalent({ yearlyPrice: 299 })).toBeCloseTo(24.9166, 3);
  });

  it('define o título e a descrição da página ao iniciar', () => {
    const { component, title, meta } = createComponent();
    component.ngOnInit();

    expect(title.setTitle).toHaveBeenCalledWith('Planos — Investindo em Negócios');
    expect(meta.updateTag).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'description' }));
  });

  it('restaura o título e a descrição padrão ao destruir', () => {
    const { component, title, meta } = createComponent();
    component.ngOnInit();
    meta.updateTag.calls.reset();

    component.ngOnDestroy();

    expect(title.setTitle).toHaveBeenCalledWith(jasmine.stringMatching(/Investindo em Negócios/));
    expect(meta.updateTag).toHaveBeenCalled();
  });

  it('transpõe o comparativo de recursos em um card por plano, preservando a ordem dos valores', () => {
    const { component } = createComponent();
    const byPlan = component.comparisonByPlan;

    expect(byPlan.length).toBe(component.plans.length);
    byPlan.forEach((planColumn, planIndex) => {
      expect(planColumn.name).toBe(component.plans[planIndex].name);
      planColumn.rows.forEach((row, rowIndex) => {
        expect(row.value).toBe(component.comparisonRows[rowIndex].values[planIndex]);
      });
    });
  });
});
