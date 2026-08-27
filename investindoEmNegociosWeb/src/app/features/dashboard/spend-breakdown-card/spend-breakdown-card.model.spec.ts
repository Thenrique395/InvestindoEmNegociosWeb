import { buildSpendBreakdown, SpendSlice } from './spend-breakdown-card.model';

function s(label: string, total: number, percent: number): SpendSlice {
  return { label, total, percent, color: 'var(--chart-1)' };
}

describe('spend-breakdown-card.model', () => {
  it('ordena da maior para a menor e corta no limite do card', () => {
    const view = buildSpendBreakdown([s('C', 100, 10), s('A', 900, 60), s('B', 400, 20), s('D', 50, 5), s('E', 20, 5)]);
    expect(view.rows.map((r) => r.label)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('o insight fala de concentração, não de valor — o valor já está na linha', () => {
    const view = buildSpendBreakdown([s('Moradia', 3140, 51), s('Alimentação', 1410, 23), s('Transporte', 962, 16)]);
    expect(view.insight).toBe('Moradia foi sua maior despesa, com 51% do total.');
  });

  it('com menos de três categorias não há distribuição a comentar', () => {
    expect(buildSpendBreakdown([s('Moradia', 3140, 80), s('Lazer', 700, 20)]).insight).toBeNull();
  });

  it('sem categoria não inventa insight nem linha', () => {
    const view = buildSpendBreakdown([]);
    expect(view.rows).toEqual([]);
    expect(view.insight).toBeNull();
  });

  it('percentual zerado não vira insight', () => {
    expect(buildSpendBreakdown([s('A', 0, 0), s('B', 0, 0), s('C', 0, 0)]).insight).toBeNull();
  });
});
