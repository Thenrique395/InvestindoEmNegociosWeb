import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationItem } from '../notifications.service';
import { hasAtLeastRole, UserRole } from '../roles';
import { GlobalSearchComponent } from './global-search/global-search.component';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { UserMenuComponent } from './user-menu/user-menu.component';

export type TopbarRouteReload = {
  path: string;
  event?: Event;
};

export type TopbarNotificationRead = {
  item: NotificationItem;
  event?: Event;
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, GlobalSearchComponent, NotificationBellComponent, UserMenuComponent],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  readonly notificationsOpen = input.required<boolean>();
  readonly notificationsLoading = input.required<boolean>();
  readonly notificationsError = input.required<string>();
  readonly notifications = input.required<NotificationItem[]>();
  readonly unreadCount = input.required<number>();
  readonly userMenuOpen = input.required<boolean>();
  readonly avatarUrl = input.required<string>();
  readonly userInitials = input.required<string>();
  readonly displayName = input.required<string>();
  readonly isLightTheme = input.required<boolean>();
  readonly financialValuesHidden = input.required<boolean>();
  readonly currentRole = input<UserRole | null>(null);
  readonly mobileMenuOpen = input(false);
  // Modo enxuto (ex.: onboarding): esconde busca, Assistente IA e notificações —
  // não há o que buscar/notificar no primeiro acesso.
  readonly minimal = input(false);

  readonly menuToggle = output<void>();
  readonly themeToggle = output<void>();
  readonly financialValuesToggle = output<void>();
  readonly notificationsToggle = output<void>();
  readonly notificationsRefresh = output<void>();
  readonly notificationRead = output<TopbarNotificationRead>();
  readonly userMenuToggle = output<void>();
  readonly routeReload = output<TopbarRouteReload>();
  readonly logoutRequested = output<void>();

  readonly canUseAssistant = computed(() => hasAtLeastRole(this.currentRole(), 'Intermediate'));

  reloadIfSame(path: string, event?: Event): void {
    this.routeReload.emit({ path, event });
  }
}
