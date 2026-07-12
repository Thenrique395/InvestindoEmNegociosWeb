import { InvestmentMovement, InvestmentPosition } from '../investments.service';
import { buildInvestmentsOverview, positionProfit, positionProfitPercent } from './investments-overview.model';

function pos(p: Partial<InvestmentPosition> & { id: string }): InvestmentPosition {
  return {
    type: 'ACOES', asset: 'ABC', quantity: 10, avgPrice: 10, openedAt: '2026-01-01',
    account: 'Corretora', movements: [], currency: 'BRL',
    ...p
  } as InvestmentPosition;
}
function mov(p: Partial<InvestmentMovement> & { type: InvestmentMovement['type'] }): InvestmentMovement {
  return { id: Math.random().toString(), quantity: 1, price: 100, date: '2026-07-10', ...p } as InvestmentMovement;
}

describe('investments-overview.model', () => {
  const today = new Date(2026, 6, 15);

  it('separa valor de mercado, investido e valorização', () => {
    // 10 x custo 10 = 100 investido; com cotação 15 -> mercado 150; valorização 50
    const o = buildInvestmentsOverview([pos({ id: 'p1', quantity: 10, avgPrice: 10, marketPrice: 15 })], today);
    expect(o.invested).toBe(100);
    expect(o.marketValue).toBe(150);
    expect(o.growth).toBe(50);
    expect(o.profitPercent).toBe(50);
  });

  it('sem cotação usa preço médio (não inventa preço) -> valorização 0', () => {
    const o = buildInvestmentsOverview([pos({ id: 'p1', quantity: 10, avgPrice: 10 })], today);
    expect(o.marketValue).toBe(100);
    expect(o.growth).toBe(0);
  });

  it('proventos não entram como aporte nem valorização', () => {
    const o = buildInvestmentsOverview([
      pos({ id: 'p1', quantity: 10, avgPrice: 10, marketPrice: 10, movements: [mov({ type: 'DIVIDENDO', quantity: 1, price: 30 })] })
    ], today);
    expect(o.proventos).toBe(30);
    expect(o.growth).toBe(0); // dividendo não vira valorização
  });

  it('aporte e resgate do mês', () => {
    const o = buildInvestmentsOverview([
      pos({ id: 'p1', movements: [
        mov({ type: 'APORTE', quantity: 1, price: 500, date: '2026-07-05' }),
        mov({ type: 'RESGATE', quantity: 1, price: 200, date: '2026-07-08' }),
        mov({ type: 'APORTE', quantity: 1, price: 999, date: '2026-06-01' }) // mês anterior
      ] })
    ], today);
    expect(o.aporteMonth).toBe(500);
    expect(o.resgateMonth).toBe(200);
    expect(o.resultMonth).toBe(300);
  });

  it('distribuição por tipo em % do valor de mercado', () => {
    const o = buildInvestmentsOverview([
      pos({ id: 'p1', type: 'ACOES', quantity: 10, avgPrice: 10, marketPrice: 15 }), // 150
      pos({ id: 'p2', type: 'RF', quantity: 50, avgPrice: 1, marketPrice: 1 })        // 50
    ], today);
    expect(o.distribution.length).toBe(2);
    expect(o.distribution[0].key).toBe('ACOES');
    expect(o.distribution[0].percent).toBe(75);
  });

  it('rentabilidade por posição', () => {
    const p = pos({ id: 'p1', quantity: 10, avgPrice: 10, marketPrice: 12 });
    expect(positionProfit(p)).toBe(20);
    expect(positionProfitPercent(p)).toBe(20);
  });
});
