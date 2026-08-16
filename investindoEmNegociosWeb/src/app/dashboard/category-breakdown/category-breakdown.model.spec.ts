import {
  buildCategoryComparison,
  buildCategoryInsight,
  categoryCountLabel,
  CategorySlice,
  hasSufficientCategoryDistribution
} from './category-breakdown.model';

function slice(partial: Partial<CategorySlice> & { label: string }): CategorySlice {
  return { total: 0, percent: 0, color: 'var(--chart-1)', ...partial };
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

    it('retorna null quando não há categorias suficientes para distribuição', () => {
      const slices = [slice({ label: 'Moradia', total: 2000, percent: 100 })];
      expect(buildCategoryInsight('expense', slices, true)).toBeNull();
    });

    it('retorna null com duas categorias porque ainda é histórico insuficiente', () => {
      const slices = [
        slice({ label: 'Salário', total: 4000, percent: 80 }),
        slice({ label: 'Freelas', total: 1000, percent: 20 })
      ];
      expect(buildCategoryInsight('income', slices, true)).toBeNull();
    });

    it('destaca a maior despesa com percentual quando há várias categorias', () => {
      const slices = [
        slice({ label: 'Moradia', total: 1200, percent: 50 }),
        slice({ label: 'Alimentação', total: 800, percent: 33 }),
        slice({ label: 'Transporte', total: 400, percent: 17 })
      ];
      expect(buildCategoryInsight('expense', slices, true)).toBe('Moradia foi sua maior despesa, com 50% do total.');
    });

    it('destaca a maior fonte de renda quando há várias categorias', () => {
      const slices = [
        slice({ label: 'Salário', total: 4000, percent: 75 }),
        slice({ label: 'Freelas', total: 1000, percent: 19 }),
        slice({ label: 'Reembolso', total: 300, percent: 6 })
      ];
      expect(buildCategoryInsight('income', slices, true)).toBe(
        'Salário foi sua maior fonte de renda, com 75% do total.'
      );
    });
  });

  describe('buildCategoryComparison', () => {
    it('retorna null sem base do período anterior', () => {
      const slices = [slice({ label: 'Moradia', total: 2000, percent: 100, previousTotal: null })];
      expect(buildCategoryComparison('expense', slices, true)).toBeNull();
    });

    it('retorna null quando desabilitado', () => {
      const slices = [
        slice({ label: 'Moradia', total: 2000, percent: 80, previousTotal: 1000 }),
        slice({ label: 'Alimentação', total: 300, percent: 12 }),
        slice({ label: 'Transporte', total: 200, percent: 8 })
      ];
      expect(buildCategoryComparison('expense', slices, false)).toBeNull();
    });

    it('indica estabilidade quando a variação é menor que 1%', () => {
      const slices = [
        slice({ label: 'Moradia', total: 1005, percent: 80, previousTotal: 1000 }),
        slice({ label: 'Alimentação', total: 150, percent: 12 }),
        slice({ label: 'Transporte', total: 100, percent: 8 })
      ];
      expect(buildCategoryComparison('expense', slices, true)).toBe(
        'Despesas com Moradia ficaram estáveis em relação ao período anterior.'
      );
    });

    it('indica aumento de despesa', () => {
      const slices = [
        slice({ label: 'Moradia', total: 1200, percent: 80, previousTotal: 1000 }),
        slice({ label: 'Alimentação', total: 200, percent: 13 }),
        slice({ label: 'Transporte', total: 100, percent: 7 })
      ];
      expect(buildCategoryComparison('expense', slices, true)).toBe(
        'Despesas com Moradia subiram 20% em relação ao período anterior.'
      );
    });

    it('indica queda e usa o rótulo de receita', () => {
      const slices = [
        slice({ label: 'Salário', total: 920, percent: 80, previousTotal: 1000 }),
        slice({ label: 'Freelas', total: 150, percent: 13 }),
        slice({ label: 'Reembolso', total: 80, percent: 7 })
      ];
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

  describe('hasSufficientCategoryDistribution', () => {
    it('exige pelo menos três categorias', () => {
      expect(hasSufficientCategoryDistribution([])).toBeFalse();
      expect(hasSufficientCategoryDistribution([slice({ label: 'A' })])).toBeFalse();
      expect(hasSufficientCategoryDistribution([slice({ label: 'A' }), slice({ label: 'B' })])).toBeFalse();
      expect(hasSufficientCategoryDistribution([slice({ label: 'A' }), slice({ label: 'B' }), slice({ label: 'C' })])).toBeTrue();
    });
  });
});
