import {
  buildCategoryComparison,
  buildCategoryInsight,
  categoryCountLabel,
  CategorySlice
} from './category-breakdown.model';

function slice(partial: Partial<CategorySlice> & { label: string }): CategorySlice {
  return { total: 0, percent: 0, color: 'var(--color-chart-series-1)', ...partial };
}

describe('category-breakdown.model', () => {
  describe('buildCategoryInsight', () => {
    it('retorna null quando insights desabilitados (plano Essencial)', () => {
      const slices = [slice({ label: 'Moradia', total: 2000, percent: 100 })];
      expect(buildCategoryInsight('expense', slices, false)).toBeNull();
    });

    it('retorna null sem dados', () => {
      expect(buildCategoryInsight('expense', [], true)).toBeNull();
    });

    it('descreve concentração quando há uma única categoria de despesa', () => {
      const slices = [slice({ label: 'Moradia', total: 2000, percent: 100 })];
      expect(buildCategoryInsight('expense', slices, true)).toBe(
        'Todos os seus gastos estão concentrados em Moradia.'
      );
    });

    it('descreve concentração quando há uma única fonte de receita', () => {
      const slices = [slice({ label: 'Salário', total: 5000, percent: 100 })];
      expect(buildCategoryInsight('income', slices, true)).toBe('Sua renda está concentrada em Salário.');
    });

    it('destaca a maior despesa com percentual quando há várias categorias', () => {
      const slices = [
        slice({ label: 'Moradia', total: 1200, percent: 60 }),
        slice({ label: 'Alimentação', total: 800, percent: 40 })
      ];
      expect(buildCategoryInsight('expense', slices, true)).toBe('Moradia foi sua maior despesa, com 60% do total.');
    });

    it('destaca a maior fonte de renda quando há várias categorias', () => {
      const slices = [
        slice({ label: 'Salário', total: 4000, percent: 80 }),
        slice({ label: 'Freelas', total: 1000, percent: 20 })
      ];
      expect(buildCategoryInsight('income', slices, true)).toBe(
        'Salário foi sua maior fonte de renda, com 80% do total.'
      );
    });
  });

  describe('buildCategoryComparison', () => {
    it('retorna null sem base do período anterior', () => {
      const slices = [slice({ label: 'Moradia', total: 2000, percent: 100, previousTotal: null })];
      expect(buildCategoryComparison('expense', slices, true)).toBeNull();
    });

    it('retorna null quando desabilitado', () => {
      const slices = [slice({ label: 'Moradia', total: 2000, percent: 100, previousTotal: 1000 })];
      expect(buildCategoryComparison('expense', slices, false)).toBeNull();
    });

    it('indica estabilidade quando a variação é menor que 1%', () => {
      const slices = [slice({ label: 'Moradia', total: 1005, percent: 100, previousTotal: 1000 })];
      expect(buildCategoryComparison('expense', slices, true)).toBe(
        'Despesas com Moradia ficaram estáveis em relação ao período anterior.'
      );
    });

    it('indica aumento de despesa', () => {
      const slices = [slice({ label: 'Moradia', total: 1200, percent: 100, previousTotal: 1000 })];
      expect(buildCategoryComparison('expense', slices, true)).toBe(
        'Despesas com Moradia subiram 20% em relação ao período anterior.'
      );
    });

    it('indica queda e usa o rótulo de receita', () => {
      const slices = [slice({ label: 'Salário', total: 920, percent: 100, previousTotal: 1000 })];
      expect(buildCategoryComparison('income', slices, true)).toBe(
        'Receitas de Salário caíram 8% em relação ao período anterior.'
      );
    });
  });

  describe('categoryCountLabel', () => {
    it('usa singular para uma categoria', () => {
      expect(categoryCountLabel(1)).toBe('1 categoria');
    });

    it('usa plural para várias', () => {
      expect(categoryCountLabel(3)).toBe('3 categorias');
    });
  });
});
