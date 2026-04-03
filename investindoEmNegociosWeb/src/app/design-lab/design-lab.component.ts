import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { filter } from 'rxjs';

type SectionStatus = 'done' | 'next' | 'neutral';

type LabSectionItem = {
  key: string;
  label: string;
  route: string;
  status: SectionStatus;
};

type LabSectionGroup = {
  label: string;
  items: LabSectionItem[];
};

@Component({
  selector: 'app-design-lab',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, EmptyStateComponent, StatusBadgeComponent],
  templateUrl: './design-lab.component.html',
  styleUrls: ['./design-lab.component.scss']
})
export class DesignLabComponent {
  showConfirmModal = false;
  showSignupStyleModal = false;
  currentSection = 'sidebar';
  activeSidebarItem = 'Dashboard';
  activeCollapsibleItem = 'Dashboard';
  activeMobileItem = 'Dashboard';
  activeTopbarMenu: 'light' | 'dark' | null = null;
  activeTopbarNotifications: 'light' | 'dark' | null = null;
  isLightPreviewDarkMode = false;
  isDarkPreviewDarkMode = true;
  isSidebarRailExpanded = false;
  isMobileDrawerOpen = false;
  currentPalette: 'center' | 'premium' = 'center';
  currentTone: 'light' | 'dark' = 'light';
  currentDirection: 'center' | 'editorial' | 'signature' = 'center';

  readonly sectionGroups: LabSectionGroup[] = [
    {
      label: 'Concluído',
      items: [
        { key: 'sidebar', label: 'Sidebar', route: '/design-lab/sidebar', status: 'done' as const },
        { key: 'topbar', label: 'Topbar', route: '/design-lab/topbar', status: 'done' as const },
        { key: 'buttons', label: 'Botões', route: '/design-lab/botoes', status: 'next' as const },
        { key: 'page-header', label: 'Page Header', route: '/design-lab/page-header', status: 'neutral' as const },
        { key: 'kpi-card', label: 'KPI Card', route: '/design-lab/kpi-card', status: 'neutral' as const },
        { key: 'forms', label: 'Inputs e filtros', route: '/design-lab/forms', status: 'neutral' as const },
        { key: 'cards', label: 'Cards e painéis', route: '/design-lab/cards', status: 'neutral' as const },
        { key: 'tables', label: 'Tabelas e listas', route: '/design-lab/tables', status: 'neutral' as const },
        { key: 'states', label: 'Estados', route: '/design-lab/states', status: 'neutral' as const },
        { key: 'modals', label: 'Modais', route: '/design-lab/modals', status: 'neutral' as const },
        { key: 'navigation', label: 'Navegação', route: '/design-lab/navigation', status: 'neutral' as const }
      ]
    },
    {
      label: 'Exploração',
      items: [
        { key: 'screens', label: 'Telas', route: '/design-lab/telas', status: 'neutral' as const }
      ]
    }
  ];

  readonly rows = [
    { name: 'Fatura Nubank', status: 'Pendente', amount: 'R$ 1.280,45' },
    { name: 'Meta Reserva', status: 'Recebido', amount: 'R$ 320,00' },
    { name: 'Parcela notebook', status: 'Antecipado', amount: 'R$ 210,00' }
  ];

  readonly sidebarProfileViews = [
    {
      label: 'Basic',
      note: 'Operação essencial, sem excesso de profundidade.',
      items: ['Dashboard', 'Despesas', 'Receitas', 'Calendário', 'Cartões', 'Metas']
    },
    {
      label: 'Intermediate',
      note: 'Mais leitura e acompanhamento do mês.',
      items: ['Dashboard', 'Despesas', 'Receitas', 'Cartões', 'Contas', 'Categorias', 'Metas', 'Investimentos', 'Fechamento mensal']
    },
    {
      label: 'Advanced',
      note: 'Patrimônio, comparativos e apoio à decisão.',
      items: ['Dashboard', 'Despesas', 'Receitas', 'Cartões', 'Contas e carteiras', 'Categorias', 'Investimentos', 'Metas', 'Empréstimos', 'Fechamento mensal', 'Assistente financeiro']
    },
    {
      label: 'Admin',
      note: 'Inclui gestão do sistema para poucos perfis.',
      items: ['Dashboard', 'Despesas', 'Receitas', 'Calendário', 'Cartões', 'Contas e carteiras', 'Categorias', 'Investimentos', 'Metas', 'Empréstimos', 'Fechamento mensal', 'Assistente financeiro', 'Assinatura', 'Perfil', 'Preferências', 'Segurança', 'Exportações e dados', 'Usuários', 'Configuração do sistema', 'Robôs']
    }
  ];

  readonly collapsibleSidebarItems = [
    { label: 'Dashboard', short: 'Da' },
    { label: 'Despesas', short: 'De' },
    { label: 'Receitas', short: 'Re' },
    { label: 'Cartões', short: 'Ca' },
    { label: 'Investimentos', short: 'In' },
    { label: 'Metas', short: 'Me' }
  ];

  readonly mobileSidebarGroups = [
    {
      title: 'Operação',
      items: ['Dashboard', 'Despesas', 'Receitas', 'Cartões']
    },
    {
      title: 'Planejamento',
      items: ['Metas', 'Investimentos', 'Fechamento mensal']
    },
    {
      title: 'Conta',
      items: ['Perfil', 'Segurança']
    }
  ];

  readonly paletteOptions = [
    { key: 'center' as const, label: 'Command Center' },
    { key: 'premium' as const, label: 'Command Premium' }
  ];

  readonly toneOptions = [
    { key: 'light' as const, label: 'Light' },
    { key: 'dark' as const, label: 'Dark' }
  ];

  readonly directionOptions = [
    { key: 'center' as const, label: 'Command Center' },
    { key: 'editorial' as const, label: 'Command Editorial' },
    { key: 'signature' as const, label: 'Command Signature' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.syncSection();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.syncSection());
  }

  private syncSection(): void {
    this.currentSection = (this.route.snapshot.data['section'] as string) || 'sidebar';
  }

  setPalette(palette: 'center' | 'premium'): void {
    this.currentPalette = palette;
  }

  setTone(tone: 'light' | 'dark'): void {
    this.currentTone = tone;
  }

  setDirection(direction: 'center' | 'editorial' | 'signature'): void {
    this.currentDirection = direction;
  }

  setActiveSidebarItem(item: string): void {
    this.activeSidebarItem = item;
  }

  setActiveCollapsibleItem(item: string): void {
    this.activeCollapsibleItem = item;
  }

  toggleSidebarRail(): void {
    this.isSidebarRailExpanded = !this.isSidebarRailExpanded;
  }

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen = !this.isMobileDrawerOpen;
  }

  setActiveMobileItem(item: string): void {
    this.activeMobileItem = item;
  }

  closeTopbarOverlays(): void {
    this.activeTopbarMenu = null;
    this.activeTopbarNotifications = null;
  }

  toggleTopbarUserMenu(menu: 'light' | 'dark'): void {
    this.activeTopbarNotifications = null;
    this.activeTopbarMenu = this.activeTopbarMenu === menu ? null : menu;
  }

  toggleTopbarNotifications(menu: 'light' | 'dark'): void {
    this.activeTopbarMenu = null;
    this.activeTopbarNotifications = this.activeTopbarNotifications === menu ? null : menu;
  }

  toggleTopbarTheme(preview: 'light' | 'dark'): void {
    if (preview === 'light') {
      this.isLightPreviewDarkMode = !this.isLightPreviewDarkMode;
      return;
    }

    this.isDarkPreviewDarkMode = !this.isDarkPreviewDarkMode;
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (target?.closest('.shell-user-menu, .shell-notification-menu')) {
      return;
    }

    this.closeTopbarOverlays();
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    this.closeTopbarOverlays();
  }
}
