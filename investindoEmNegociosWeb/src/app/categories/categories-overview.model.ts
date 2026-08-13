import { CategoryDto, CategoryType } from '../categories.service';

/**
 * Modelo puro da Central de Categorias — foco em cadastro, edição e exclusão.
 * Não persiste cor/ícone (não há campo no backend): são identidade visual
 * determinística, sempre acompanhada de texto.
 */

export type CategoryTab = 'all' | CategoryType;
export type OriginFilter = 'all' | 'default' | 'custom';
export type StatusFilter = 'all' | 'active' | 'inactive';

export interface CategoryView {
  category: CategoryDto;
  icon: string;
  color: string;
  origin: 'default' | 'custom';
  isActive: boolean;
}

export interface CategoriesFilters {
  search: string;
  tab: CategoryTab;
  origin: OriginFilter;
  status: StatusFilter;
}

export interface CategoriesOverview {
  total: number;
  activeCount: number;
  expenseCount: number;
  incomeCount: number;
  customCount: number;
}

/** Paleta fixa de categoria: `--chart-1` a `--chart-7`, sem seletor livre. TELAS.md §7. */
export const CATEGORY_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)'
];

const ICON_BY_NAME: Record<string, string> = {
  mercado: '🛒',
  alimentacao: '🍽️',
  lazer: '🎯',
  salario: '💰',
  aluguel: '🏠',
  moradia: '🏠',
  transporte: '🚌',
  saude: '🩺',
  educacao: '📚',
  compras: '🛍️',
  investimentos: '📈',
  agua: '💧',
  luz: '💡',
  energia: '💡',
  internet: '🌐',
  academia: '🏋️',
  dividendos: '📊',
  freelancer: '💻',
  reembolso: '↩️'
};

export function normalizeText(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

export function iconForCategory(name: string, type: CategoryType | null): string {
  const key = normalizeText(name);
  if (ICON_BY_NAME[key]) return ICON_BY_NAME[key];
  return type === 'Income' ? '💵' : '🧾';
}

export function colorForCategory(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

export function buildCategoryViews(categories: CategoryDto[]): CategoryView[] {
  return (categories || []).map((category) => ({
    category,
    icon: iconForCategory(category.name, category.appliesTo),
    color: colorForCategory(category.id || category.name),
    origin: category.isDefault ? 'default' : 'custom',
    isActive: category.isActive !== false
  }));
}

export function buildOverview(views: CategoryView[]): CategoriesOverview {
  return {
    total: views.length,
    activeCount: views.filter((v) => v.isActive).length,
    expenseCount: views.filter((v) => v.category.appliesTo === 'Expense').length,
    incomeCount: views.filter((v) => v.category.appliesTo === 'Income').length,
    customCount: views.filter((v) => v.origin === 'custom').length
  };
}

export function filterCategories(views: CategoryView[], filters: CategoriesFilters): CategoryView[] {
  const search = normalizeText(filters.search);
  return (views || []).filter((view) => {
    const c = view.category;
    if (filters.tab !== 'all' && c.appliesTo !== filters.tab) return false;
    if (search && !normalizeText(c.name).includes(search)) return false;
    if (filters.origin === 'default' && view.origin !== 'default') return false;
    if (filters.origin === 'custom' && view.origin !== 'custom') return false;
    if (filters.status === 'active' && !view.isActive) return false;
    if (filters.status === 'inactive' && view.isActive) return false;
    return true;
  });
}

export function sortByName(views: CategoryView[]): CategoryView[] {
  return (views || []).slice().sort((a, b) => a.category.name.localeCompare(b.category.name, 'pt-BR'));
}
