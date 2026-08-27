import { CategoryExpenseResponse } from '../../core/reports.service';
import {
  CATEGORY_PALETTE,
  buildComparisonWindow,
  buildExpenseCategoryBars,
  buildReportComparison,
  buildTopExpenses
} from './reports-overview.model';
import { MonthlySummaryReportResponse } from '../../core/reports.service';

function cat(name: string, amount: number, percent: number): CategoryExpenseResponse {
  return { categoryName: name, amount, percentageOfTotal: percent };
}

function report(year: number, month: number, income: number, expenses: number): MonthlySummaryReportResponse {
  return {
    year,
    month,
    totalIncome: income,
    totalExpenses: expenses,
    netBalance: income - expenses,
    savingsRate: income ? ((income - expenses) / income) * 100 : 0,
    expensesByCategory: [],
    topExpenses: []
  };
}

describe('reports-overview.model', () => {
  it('monta barras de categoria com cor da paleta e percentual limitado', () => {
    const items = buildExpenseCategoryBars([
      cat('A', 100, 50), cat('B', 60, 30), cat('C', 20, 10),
      cat('D', 10, 5), cat('E', 8, 4), cat('F', 2, 120)
    ]);

    expect(items.length).toBe(6);
    expect(items[0]).toEqual({ categoryName: 'A', amount: 100, percentageOfTotal: 50, color: CATEGORY_PALETTE[0] });
    // 6º item recicla a primeira cor
    expect(items[5].color).toBe(CATEGORY_PALETTE[0]);
    expect(items[5].percentageOfTotal).toBe(100);
  });

  it('retorna lista vazia sem categorias', () => {
    expect(buildExpenseCategoryBars(null)).toEqual([]);
    expect(buildExpenseCategoryBars(undefined)).toEqual([]);
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

  it('monta janela comparativa preservando virada de ano', () => {
    const window = buildComparisonWindow(2026, 2, 6, [
      'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
    ]);

    expect(window.map((m) => `${m.year}-${m.month}`)).toEqual([
      '2025-9', '2025-10', '2025-11', '2025-12', '2026-1', '2026-2'
    ]);
    expect(window[0].label).toBe('Set 25');
    expect(window[5].label).toBe('Fev 26');
  });

  it('monta comparação mensal com escala única para receitas/despesas e saldo', () => {
    const monthRefs = buildComparisonWindow(2026, 3, 6, [
      'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
    ]);
    const comparison = buildReportComparison([
      report(2026, 1, 1000, 700),
      report(2026, 2, 2000, 1500),
      report(2026, 3, 500, 800)
    ], monthRefs);

    const january = comparison.find((m) => m.year === 2026 && m.month === 1);
    const february = comparison.find((m) => m.year === 2026 && m.month === 2);
    const march = comparison.find((m) => m.year === 2026 && m.month === 3);

    expect(january?.incomePercent).toBe(50);
    expect(february?.incomePercent).toBe(100);
    expect(march?.netBalance).toBe(-300);
    expect(march?.balancePercent).toBe(60);
  });
});
