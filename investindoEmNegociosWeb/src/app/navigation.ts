import { APP_FEATURE_KEYS, AppFeatureKey, hasFeatureForRole } from './features';
import { hasAtLeastRole, UserRole } from './roles';

/**
 * Estrutura do menu lateral — fonte única.
 *
 * Vive fora do `SidebarComponent` porque a exigência de permissão de cada item
 * precisa poder ser comparada com a da rota correspondente. `navigation.spec.ts`
 * faz esse cruzamento: se um item aparecer no menu com regra diferente da rota,
 * o teste quebra.
 *
 * É o "menu mostrando item que a rota bloqueia" que o ARQUITETURA_ANGULAR.md
 * §9.3 aponta como bug clássico.
 *
 * Ordem e agrupamento seguem `PERFIS_E_PERMISSOES.md`.
 */

export type SidebarIcon =
  | 'dashboard'
  | 'expense'
  | 'income'
  | 'calendar'
  | 'card'
  | 'account'
  | 'category'
  | 'investment'
  | 'goal'
  | 'loan'
  | 'snapshot'
  | 'assistant'
  | 'calculator'
  | 'admin'
  | 'parameters'
  | 'robot'
  | 'budget'
  | 'scenario'
  | 'report'
  | 'profile'
  | 'settings';

export type SidebarTone = 'danger' | 'success' | 'warning' | 'info';

export interface SidebarNavItem {
  label: string;
  path: string;
  icon: SidebarIcon;
  minRole?: UserRole;
  feature?: AppFeatureKey;
  tone?: SidebarTone;
}

export interface SidebarSection {
  id: string;
  label?: string;
  items: SidebarNavItem[];
}

export const NAV_SECTIONS: SidebarSection[] = [
  {
    id: 'overview',
    label: 'Visão geral',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', minRole: 'Basic' },
      { label: 'Calendário', path: '/calendario', icon: 'calendar', minRole: 'Basic' },
    ],
  },
  {
    id: 'transactions',
    label: 'Movimentações',
    items: [
      { label: 'Despesas', path: '/despesas', icon: 'expense', minRole: 'Basic', tone: 'danger' },
      { label: 'Receitas', path: '/receitas', icon: 'income', minRole: 'Basic', tone: 'success' },
      { label: 'Cartões', path: '/cartoes', icon: 'card', feature: APP_FEATURE_KEYS.cardsRead },
      { label: 'Contas', path: '/contas', icon: 'account', feature: APP_FEATURE_KEYS.accountsRead },
      {
        label: 'Categorias',
        path: '/categorias',
        icon: 'category',
        feature: APP_FEATURE_KEYS.categoriesRead,
      },
    ],
  },
  {
    id: 'planning',
    label: 'Planejamento',
    items: [
      { label: 'Metas', path: '/metas', icon: 'goal', minRole: 'Basic' },
      { label: 'Orçamento', path: '/orcamento', icon: 'budget', feature: APP_FEATURE_KEYS.budgetAccess },
      { label: 'Empréstimos', path: '/emprestimos', icon: 'loan', minRole: 'Intermediate', tone: 'warning' },
      {
        label: 'Investimentos',
        path: '/investimentos',
        icon: 'investment',
        feature: APP_FEATURE_KEYS.investmentsAccess,
      },
    ],
  },
  {
    id: 'insights',
    label: 'Análises',
    items: [
      { label: 'Relatórios', path: '/relatorios', icon: 'report', feature: APP_FEATURE_KEYS.reportsAccess },
      { label: 'Simulador', path: '/simulador', icon: 'scenario', feature: APP_FEATURE_KEYS.scenariosAccess },
      { label: 'Assistente', path: '/assistente', icon: 'assistant', minRole: 'Intermediate', tone: 'info' },
      // Fora do PERFIS_E_PERMISSOES.md, mas as telas existem e estão no ar:
      // tirá-las do menu deixaria a funcionalidade inacessível. Ver P13.
      { label: 'Histórico mensal', path: '/snapshots', icon: 'snapshot', minRole: 'Intermediate' },
      { label: 'Calculadoras', path: '/calculadora', icon: 'calculator', minRole: 'Basic' },
    ],
  },
  {
    id: 'account',
    label: 'Conta',
    items: [
      { label: 'Perfil', path: '/perfil', icon: 'profile', minRole: 'Basic' },
      { label: 'Configurações', path: '/preferencias', icon: 'settings', minRole: 'Basic' },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    items: [
      { label: 'Usuários', path: '/admin/usuarios', icon: 'admin', feature: APP_FEATURE_KEYS.adminUsersManage },
      {
        label: 'Parâmetros',
        path: '/admin/parametros',
        icon: 'parameters',
        feature: APP_FEATURE_KEYS.adminParametersManage,
      },
      { label: 'Robôs', path: '/admin/robots', icon: 'robot', feature: APP_FEATURE_KEYS.adminRobotsManage },
    ],
  },
];

/** Um item só aparece quando o perfil o alcança. Nunca desabilitado — ausente. */
export function canShowItem(role: UserRole | null, item: SidebarNavItem): boolean {
  if (item.feature) {
    return hasFeatureForRole(role, item.feature);
  }

  return item.minRole ? hasAtLeastRole(role, item.minRole) : true;
}

/** Todos os itens, achatados. Usado pelo teste de coerência com as rotas. */
export function allNavItems(): SidebarNavItem[] {
  return NAV_SECTIONS.flatMap((section) => section.items);
}
