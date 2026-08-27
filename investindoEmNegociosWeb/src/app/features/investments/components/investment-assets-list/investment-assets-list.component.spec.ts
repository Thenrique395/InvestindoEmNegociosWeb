import { InvestmentPosition } from '../../../../core/investments.service';
import { InvestmentAssetsListComponent } from './investment-assets-list.component';

describe('InvestmentAssetsListComponent', () => {
  function position(partial: Partial<InvestmentPosition>): InvestmentPosition {
    return {
      id: partial.id ?? 'p1',
      type: partial.type ?? 'ACOES',
      asset: partial.asset ?? 'PETR4',
      quantity: partial.quantity ?? 1,
      avgPrice: partial.avgPrice ?? 10,
      openedAt: partial.openedAt ?? '2026-01-01',
      account: partial.account ?? 'XP',
      category: partial.category ?? 'Ações',
      movements: partial.movements ?? [],
      currency: partial.currency ?? 'BRL',
      marketPrice: partial.marketPrice
    };
  }

  it('identifica fonte do preço entre cotação e preço médio', () => {
    const component = new InvestmentAssetsListComponent();
    const quoted = position({ marketPrice: 12 });
    const fallback = position({});

    expect(component.priceSourceLabel(quoted)).toBe('Cotação');
    expect(component.priceSourceTone(quoted)).toBe('success');
    expect(component.priceSourceLabel(fallback)).toBe('Preço médio');
    expect(component.priceSourceTone(fallback)).toBe('muted');
  });

  it('calcula totais da lista filtrada sem somar proventos', () => {
    const component = new InvestmentAssetsListComponent();
    component.positions = [
      position({ quantity: 10, avgPrice: 10, marketPrice: 12 }),
      position({ quantity: 2, avgPrice: 50 })
    ];

    expect(component.totalInvested).toBe(200);
    expect(component.totalMarketValue).toBe(220);
    expect(component.totalResult).toBe(20);
    expect(component.valorInvestidoPosicao(component.positions[0])).toBe(100);
    expect(component.quotedPositionsCount).toBe(1);
    expect(component.averagePriceFallbackCount).toBe(1);
  });

  it('monta chips e nota de posições a partir dos filtros atuais', () => {
    const component = new InvestmentAssetsListComponent();
    component.tipos = [{ value: 'ACOES', label: 'Ações/ETFs' }];
    component.positions = [position({}), position({ id: 'p2', quantity: 0 })];
    component.totalZeroed = 1;

    expect(component.typeFilterChips).toEqual(['ALL', 'ACOES']);
    expect(component.typeChipLabel('ALL')).toBe('Todos');
    expect(component.typeChipLabel('ACOES')).toBe('Ações/ETFs');
    expect(component.positionsNote).toBe('2 posição(ões) neste filtro · 1 zerada(s)');
  });
});
