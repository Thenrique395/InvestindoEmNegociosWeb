import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_FEATURE_KEYS, AppFeatureKey, hasFeatureForRole } from '../features';
import { hasAtLeastRole, UserRole } from '../roles';

export type SidebarRouteReload = {
  path: string;
  event?: Event;
};

type SidebarIcon =
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
  | 'report';

type SidebarTone = 'danger' | 'success' | 'warning' | 'info';

type SidebarNavItem = {
  label: string;
  path: string;
  icon: SidebarIcon;
  minRole?: UserRole;
  feature?: AppFeatureKey;
  tone?: SidebarTone;
};

type SidebarSection = {
  id: string;
  label?: string;
  items: SidebarNavItem[];
};

const NAV_SECTIONS: SidebarSection[] = [
  {
    id: 'overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', minRole: 'Basic' },
      { label: 'Calendário', path: '/calendario', icon: 'calendar', minRole: 'Basic' }
    ]
  },
  {
    id: 'transactions',
    label: 'Movimentações',
    items: [
      { label: 'Despesas', path: '/despesas', icon: 'expense', minRole: 'Basic', tone: 'danger' },
      { label: 'Receitas', path: '/receitas', icon: 'income', minRole: 'Basic', tone: 'success' },
      { label: 'Cartões', path: '/cartoes', icon: 'card', minRole: 'Basic' },
      { label: 'Contas', path: '/contas', icon: 'account', minRole: 'Intermediate' },
      { label: 'Categorias', path: '/categorias', icon: 'category', feature: APP_FEATURE_KEYS.categoriesRead }
    ]
  },
  {
    id: 'planning',
    label: 'Planejamento',
    items: [
      { label: 'Metas', path: '/metas', icon: 'goal', minRole: 'Basic' },
      { label: 'Orçamento', path: '/orcamento', icon: 'budget', feature: APP_FEATURE_KEYS.budgetAccess },
      { label: 'Investimentos', path: '/investimentos', icon: 'investment', feature: APP_FEATURE_KEYS.investmentsAccess },
      { label: 'Empréstimos', path: '/emprestimos', icon: 'loan', minRole: 'Intermediate', tone: 'warning' },
      { label: 'Simulador', path: '/simulador', icon: 'scenario', feature: APP_FEATURE_KEYS.scenariosAccess }
    ]
  },
  {
    id: 'insights',
    label: 'Análises',
    items: [
      { label: 'Relatórios', path: '/relatorios', icon: 'report', feature: APP_FEATURE_KEYS.reportsAccess },
      { label: 'Histórico mensal', path: '/snapshots', icon: 'snapshot', minRole: 'Intermediate' },
      { label: 'Assistente', path: '/assistente', icon: 'assistant', minRole: 'Intermediate', tone: 'info' },
      { label: 'Calculadoras', path: '/calculadora', icon: 'calculator', minRole: 'Basic' }
    ]
  },
  {
    id: 'admin',
    label: 'Administração',
    items: [
      { label: 'Usuários', path: '/admin/usuarios', icon: 'admin', feature: APP_FEATURE_KEYS.adminUsersManage },
      { label: 'Parâmetros', path: '/admin/parametros', icon: 'parameters', feature: APP_FEATURE_KEYS.adminParametersManage },
      { label: 'Robôs', path: '/admin/robots', icon: 'robot', feature: APP_FEATURE_KEYS.adminRobotsManage }
    ]
  }
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly isLightTheme = input.required<boolean>();
  readonly brandName = input.required<string>();
  readonly currentRole = input<UserRole | null>(null);
  readonly mobileOpen = input(false);

  readonly routeReload = output<SidebarRouteReload>();
  readonly preferencesOpen = output<Event | undefined>();

  readonly visibleSections = computed(() => {
    const role = this.currentRole();
    return NAV_SECTIONS
      .map(section => ({ ...section, items: section.items.filter(item => canShowItem(role, item)) }))
      .filter(section => section.items.length > 0);
  });

  reloadIfSame(path: string, event?: Event): void {
    this.routeReload.emit({ path, event });
  }

  goToPreferences(event?: Event): void {
    this.preferencesOpen.emit(event);
  }
}

function canShowItem(role: UserRole | null, item: SidebarNavItem): boolean {
  if (item.feature) {
    return hasFeatureForRole(role, item.feature);
  }

  return item.minRole ? hasAtLeastRole(role, item.minRole) : true;
}
