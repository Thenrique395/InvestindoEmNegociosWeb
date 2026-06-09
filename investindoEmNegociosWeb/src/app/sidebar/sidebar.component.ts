import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  | 'robot';

type SidebarNavItem = {
  label: string;
  path: string;
  icon: SidebarIcon;
  minRole?: UserRole;
  feature?: AppFeatureKey;
  size: 'primary' | 'compact';
  activeTone?: string;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input({ required: true }) isLightTheme = false;
  @Input({ required: true }) brandName = '';
  @Input() currentRole: UserRole | null = null;

  @Output() routeReload = new EventEmitter<SidebarRouteReload>();
  @Output() preferencesOpen = new EventEmitter<Event | undefined>();

  readonly features = APP_FEATURE_KEYS;
  readonly navItems: SidebarNavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', minRole: 'Basic', size: 'primary' },
    { label: 'Despesas', path: '/despesas', icon: 'expense', minRole: 'Basic', size: 'primary', activeTone: 'danger' },
    { label: 'Receitas', path: '/receitas', icon: 'income', minRole: 'Basic', size: 'primary', activeTone: 'success' },
    { label: 'Calendário', path: '/calendario', icon: 'calendar', minRole: 'Basic', size: 'primary' },
    { label: 'Cartões', path: '/cartoes', icon: 'card', minRole: 'Basic', size: 'primary' },
    { label: 'Contas', path: '/contas', icon: 'account', minRole: 'Intermediate', size: 'compact' },
    { label: 'Categorias', path: '/categorias', icon: 'category', feature: this.features.categoriesRead, size: 'compact' },
    { label: 'Investimentos', path: '/investimentos', icon: 'investment', feature: this.features.investmentsAccess, size: 'compact' },
    { label: 'Metas', path: '/metas', icon: 'goal', minRole: 'Basic', size: 'primary' },
    { label: 'Empréstimos', path: '/emprestimos', icon: 'loan', minRole: 'Intermediate', size: 'compact', activeTone: 'warning' },
    { label: 'Snapshots', path: '/snapshots', icon: 'snapshot', minRole: 'Intermediate', size: 'compact' },
    { label: 'Assistente', path: '/assistente', icon: 'assistant', minRole: 'Intermediate', size: 'compact', activeTone: 'info' },
    { label: 'Calculadoras', path: '/calculadora', icon: 'calculator', minRole: 'Basic', size: 'compact' },
    { label: 'Admin', path: '/admin/usuarios', icon: 'admin', feature: this.features.adminUsersManage, size: 'compact' },
    { label: 'Parâmetros', path: '/admin/parametros', icon: 'parameters', feature: this.features.adminParametersManage, size: 'compact' },
    { label: 'Robôs', path: '/admin/robots', icon: 'robot', feature: this.features.adminRobotsManage, size: 'compact' }
  ];

  private readonly primaryLinkClass =
    'group flex min-h-[56px] items-center gap-3 rounded-[16px] border border-transparent px-[18px] py-[10px] text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]';
  private readonly compactLinkClass =
    'group flex min-h-[48px] items-center gap-3 rounded-[14px] border border-transparent px-[var(--spacing-2)] py-[var(--spacing-1)] text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]';
  private readonly activeLinkClass =
    'border-[var(--color-primary-soft)] bg-[var(--color-primary-weak)] !text-[var(--primary-text)]';
  private readonly primaryIconClass =
    'nav-icon grid h-12 w-12 place-items-center rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] transition';
  private readonly compactIconClass =
    'nav-icon grid h-10 w-10 place-items-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] transition';
  private readonly activeIconByTone: Record<string, string> = {
    primary: 'border-[var(--color-primary-soft)] bg-[var(--color-primary-weak)] !text-[var(--primary-text)]',
    danger: 'border-[var(--color-danger-soft)] bg-[var(--color-danger-weak)] !text-[var(--danger-text)]',
    success: 'border-[var(--color-success-soft)] bg-[var(--color-success-weak)] !text-[var(--success-text)]',
    warning: 'border-[var(--color-warning-soft)] bg-[var(--color-warning-weak)] !text-[var(--warning-text)]',
    info: 'border-[var(--color-info-soft)] bg-[var(--color-info-weak)] !text-[var(--info-text)]'
  };

  hasAccess(minRole: UserRole): boolean {
    return hasAtLeastRole(this.currentRole, minRole);
  }

  hasFeature(featureKey: AppFeatureKey): boolean {
    return hasFeatureForRole(this.currentRole, featureKey);
  }

  canShowItem(item: SidebarNavItem): boolean {
    if (item.feature) {
      return this.hasFeature(item.feature);
    }

    return item.minRole ? this.hasAccess(item.minRole) : true;
  }

  itemLinkClass(item: SidebarNavItem, isActive: boolean): string {
    const baseClass = item.size === 'primary' ? this.primaryLinkClass : this.compactLinkClass;
    return isActive ? `${baseClass} ${this.activeLinkClass}` : baseClass;
  }

  itemIconClass(item: SidebarNavItem, isActive: boolean): string {
    const baseClass = item.size === 'primary' ? this.primaryIconClass : this.compactIconClass;
    if (!isActive) {
      return baseClass;
    }

    return `${baseClass} ${this.activeIconByTone[item.activeTone ?? 'primary']}`;
  }

  itemTextClass(item: SidebarNavItem): string {
    return item.size === 'primary'
      ? 'nav-text text-[var(--text-md)] font-semibold'
      : 'nav-text text-[var(--text-sm)] font-semibold';
  }

  reloadIfSame(path: string, event?: Event): void {
    this.routeReload.emit({ path, event });
  }

  goToPreferences(event?: Event): void {
    this.preferencesOpen.emit(event);
  }
}
