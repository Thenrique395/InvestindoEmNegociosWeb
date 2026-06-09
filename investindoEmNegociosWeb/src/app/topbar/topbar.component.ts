import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationItem } from '../notifications.service';
import { UserRole } from '../roles';

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
  imports: [NgClass, RouterLink],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent {
  @Input({ required: true }) brandSlogan = '';
  @Input({ required: true }) notificationsOpen = false;
  @Input({ required: true }) notificationsLoading = false;
  @Input({ required: true }) notificationsError = '';
  @Input({ required: true }) notifications: NotificationItem[] = [];
  @Input({ required: true }) unreadCount = 0;
  @Input({ required: true }) userMenuOpen = false;
  @Input({ required: true }) avatarUrl = '';
  @Input({ required: true }) userInitials = 'U';
  @Input({ required: true }) displayName = 'Usuário';
  @Input({ required: true }) isLightTheme = true;
  @Input() currentRole: UserRole | null = null;

  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() themeToggle = new EventEmitter<void>();
  @Output() notificationsToggle = new EventEmitter<void>();
  @Output() notificationsRefresh = new EventEmitter<void>();
  @Output() notificationRead = new EventEmitter<TopbarNotificationRead>();
  @Output() userMenuToggle = new EventEmitter<void>();
  @Output() routeReload = new EventEmitter<TopbarRouteReload>();
  @Output() logoutRequested = new EventEmitter<void>();

  trackNotification(index: number, item: NotificationItem): string {
    return item.id || `${item.title}-${item.createdAt}-${index}`;
  }

  reloadIfSame(path: string, event?: Event): void {
    this.routeReload.emit({ path, event });
  }

  markNotificationRead(item: NotificationItem, event?: Event): void {
    this.notificationRead.emit({ item, event });
  }
}
