import { buildDashboardCategories } from './dashboard-categories.model';

describe('Distribuição de categorias do dashboard', () => {
  const palette = ['var(--chart-1)', 'var(--chart-2)'];
  it('não inventa categorias quando não há movimento', () => {
    expect(buildDashboardCategories([], [], palette)).toEqual({ total: 0, slices: [] });
  });
  it('agrupa categorias normalizadas, ordena por valor e compara com o período anterior', () => {
    const result = buildDashboardCategories([
      { categoria: ' Mercado ', valor: 200 }, { categoria: 'Mercado', valor: 100 },
      { categoria: 'Casa', valor: 100 }, { categoria: ' ', valor: 50 }, { valor: 50 }
    ], [{ categoria: 'Mercado', valor: 120 }, { categoria: 'Mercado', valor: 80 }], palette);
    expect(result.total).toBe(500);
    expect(result.slices).toEqual([
      { label: 'Mercado', total: 300, percent: 60, color: palette[0], previousTotal: 200 },
      { label: 'Casa', total: 100, percent: 20, color: palette[1], previousTotal: null },
      { label: 'Sem categoria', total: 100, percent: 20, color: palette[0], previousTotal: null }
    ]);
  });
  it('limita a seis fatias sem perder valor, sem comparar Outros entre períodos', () => {
    const entries = Object.freeze(Array.from({ length: 8 }, (_, index) => Object.freeze({ categoria: `Cat ${index}`, valor: 80 - index * 10 })));
    const result = buildDashboardCategories(entries, [{ categoria: 'Outros', valor: 999 }], palette);
    expect(result.slices.length).toBe(6);
    expect(result.total).toBe(360);
    expect(result.slices[5]).toEqual({ label: 'Outros', total: 60, percent: jasmine.any(Number), color: palette[1], previousTotal: null });
    expect(result.slices[5].percent).toBeCloseTo(100 / 6, 10);
    expect(entries.map(item => item.categoria)).toEqual(['Cat 0', 'Cat 1', 'Cat 2', 'Cat 3', 'Cat 4', 'Cat 5', 'Cat 6', 'Cat 7']);
  });
  it('preserva comparação zero e impede percentuais não finitos em um mês zerado', () => {
    const result = buildDashboardCategories([{ categoria: 'Casa', valor: 0 }], [{ categoria: 'Casa', valor: 0 }], palette);
    expect(result.slices[0].percent).toBe(0);
    expect(result.slices[0].previousTotal).toBe(0);
  });
});
