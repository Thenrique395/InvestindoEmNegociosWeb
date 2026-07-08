import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  viewChild
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserRole } from '../../roles';

export type UserMenuRouteReload = {
  path: string;
  event?: Event;
};

type UserMenuIcon = 'profile' | 'subscription' | 'preferences' | 'security' | 'spaces' | 'data';

type UserMenuItem = {
  path: string;
  label: string;
  description: string;
  icon: UserMenuIcon;
};

const MENU_ITEMS: UserMenuItem[] = [
  { path: '/perfil', label: 'Perfil', description: 'Nome, foto e dados pessoais', icon: 'profile' },
  { path: '/assinatura', label: 'Minha assinatura', description: 'Plano, cobrança e acesso', icon: 'subscription' },
  { path: '/preferencias', label: 'Preferências', description: 'Moeda, idioma e alertas', icon: 'preferences' },
  { path: '/seguranca', label: 'Segurança', description: 'Sessões, acessos e proteção', icon: 'security' },
  { path: '/espacos', label: 'Espaços', description: 'Separe contas e lançamentos por área', icon: 'spaces' },
  { path: '/dados', label: 'Dados da conta', description: 'Exportação, backup e exclusão', icon: 'data' }
];

const ROLE_LABELS: Record<UserRole, string> = {
  Basic: 'Perfil Básico',
  Intermediate: 'Perfil Intermediário',
  Advanced: 'Perfil Avançado',
  Admin: 'Administrador'
};

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserMenuComponent {
  readonly open = input.required<boolean>();
  readonly avatarUrl = input.required<string>();
  readonly initials = input.required<string>();
  readonly displayName = input.required<string>();
  readonly role = input<UserRole | null>(null);

  readonly toggleRequested = output<void>();
  readonly routeReload = output<UserMenuRouteReload>();
  readonly logoutRequested = output<void>();

  readonly menuItems = MENU_ITEMS;
  readonly roleLabel = computed(() => ROLE_LABELS[this.role() ?? 'Basic']);

  private readonly dropdown = viewChild<ElementRef<HTMLElement>>('dropdown');

  constructor() {
    // Padrão ARIA de menu: ao abrir, o foco entra no primeiro item
    effect(() => {
      if (this.open()) {
        setTimeout(() => this.menuButtons()[0]?.focus(), 0);
      }
    });
  }

  reloadIfSame(path: string, event?: Event): void {
    this.routeReload.emit({ path, event });
  }

  onMenuKeydown(event: KeyboardEvent): void {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) {
      return;
    }

    const buttons = this.menuButtons();
    if (!buttons.length) {
      return;
    }

    event.preventDefault();
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const target =
      event.key === 'ArrowDown' ? buttons[(current + 1) % buttons.length]
      : event.key === 'ArrowUp' ? buttons[(current - 1 + buttons.length) % buttons.length]
      : event.key === 'Home' ? buttons[0]
      : buttons[buttons.length - 1];
    target.focus();
  }

  private menuButtons(): HTMLButtonElement[] {
    const host = this.dropdown()?.nativeElement;
    return host ? Array.from(host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')) : [];
  }
}
