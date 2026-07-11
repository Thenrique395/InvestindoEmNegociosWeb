import { CategoryDto } from '../categories.service';
import {
  buildCategoryViews,
  buildOverview,
  colorForCategory,
  filterCategories,
  iconForCategory,
  sortByName,
  CategoriesFilters
} from './categories-overview.model';

function cat(p: Partial<CategoryDto> & { id: string; name: string }): CategoryDto {
  return { appliesTo: 'Expense', isDefault: false, isActive: true, ...p };
}

const categories: CategoryDto[] = [
  cat({ id: 'c1', name: 'Alimentação', appliesTo: 'Expense', isDefault: true }),
  cat({ id: 'c2', name: 'Transporte', appliesTo: 'Expense' }),
  cat({ id: 'c3', name: 'Salário', appliesTo: 'Income', isDefault: true }),
  cat({ id: 'c4', name: 'Lazer', appliesTo: 'Expense', isActive: false })
];

describe('categories-overview.model', () => {
  const views = buildCategoryViews(categories);

  describe('buildCategoryViews', () => {
    it('deriva origem, status, ícone e cor', () => {
      const v = views.find((x) => x.category.id === 'c1')!;
      expect(v.origin).toBe('default');
      expect(v.isActive).toBeTrue();
      expect(v.icon).toBe('🍽️');
      expect(v.color).toContain('--color-chart-series');
    });
  });

  describe('buildOverview', () => {
    it('agrega total, ativas, tipos e personalizadas', () => {
      const o = buildOverview(views);
      expect(o.total).toBe(4);
      expect(o.activeCount).toBe(3);
      expect(o.expenseCount).toBe(3);
      expect(o.incomeCount).toBe(1);
      expect(o.customCount).toBe(2); // Transporte e Lazer
    });
  });

  describe('filterCategories', () => {
    const base: CategoriesFilters = { search: '', tab: 'all', origin: 'all', status: 'all' };
    it('filtra por aba (tipo)', () => {
      expect(filterCategories(views, { ...base, tab: 'Income' }).length).toBe(1);
    });
    it('filtra por origem', () => {
      expect(filterCategories(views, { ...base, origin: 'default' }).length).toBe(2);
      expect(filterCategories(views, { ...base, origin: 'custom' }).length).toBe(2);
    });
    it('filtra por status', () => {
      expect(filterCategories(views, { ...base, status: 'inactive' }).length).toBe(1);
    });
    it('busca ignora acento/caixa', () => {
      expect(filterCategories(views, { ...base, search: 'salario' }).length).toBe(1);
    });
  });

  describe('helpers', () => {
    it('ícone por nome e fallback por tipo', () => {
      expect(iconForCategory('Salário', 'Income')).toBe('💰');
      expect(iconForCategory('Xpto', 'Income')).toBe('💵');
      expect(iconForCategory('Xpto', 'Expense')).toBe('🧾');
    });
    it('cor determinística', () => {
      expect(colorForCategory('c1')).toBe(colorForCategory('c1'));
    });
    it('ordena por nome', () => {
      const sorted = sortByName(views).map((v) => v.category.name);
      expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    });
  });
});
