import { CategoryExpenseResponse } from '../reports.service';
import { CATEGORY_PALETTE, buildExpenseDonutItems, buildTopExpenses } from './reports-overview.model';

function cat(name: string, amount: number, percent: number): CategoryExpenseResponse {
  return { categoryName: name, amount, percentageOfTotal: percent };
}

describe('reports-overview.model', () => {
  it('monta itens do donut com cor da paleta (ciclando)', () => {
    const items = buildExpenseDonutItems([
      cat('A', 100, 50), cat('B', 60, 30), cat('C', 20, 10),
      cat('D', 10, 5), cat('E', 8, 4), cat('F', 2, 1)
    ]);

    expect(items.length).toBe(6);
    expect(items[0]).toEqual({ label: 'A', value: 100, percent: 50, color: CATEGORY_PALETTE[0] });
    // 6º item recicla a primeira cor
    expect(items[5].color).toBe(CATEGORY_PALETTE[0]);
  });

  it('retorna lista vazia sem categorias', () => {
    expect(buildExpenseDonutItems(null)).toEqual([]);
    expect(buildExpenseDonutItems(undefined)).toEqual([]);
  });

  it('ordena maiores despesas por valor e limita', () => {
    const top = buildTopExpenses([
      cat('Moradia', 500, 40), cat('Mercado', 900, 50), cat('Lazer', 100, 10)
    ], 2);

    expect(top.map((c) => c.categoryName)).toEqual(['Mercado', 'Moradia']);
  });

  it('descarta valores não positivos e não muta a entrada', () => {
    const input = [cat('X', 0, 0), cat('Y', 50, 100), cat('Z', -10, 0)];
    const top = buildTopExpenses(input);

    expect(top.map((c) => c.categoryName)).toEqual(['Y']);
    // entrada preservada
    expect(input.length).toBe(3);
  });

  it('lida com topExpenses vazio/ausente', () => {
    expect(buildTopExpenses([])).toEqual([]);
    expect(buildTopExpenses(undefined)).toEqual([]);
  });
});
