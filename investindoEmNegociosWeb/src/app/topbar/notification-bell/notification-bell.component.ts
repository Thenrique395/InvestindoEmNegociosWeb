import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NotificationItem } from '../../notifications.service';

export type NotificationReadEvent = {
  item: NotificationItem;
  event?: Event;
};

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationBellComponent {
  readonly open = input.required<boolean>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string>();
  readonly items = input.required<NotificationItem[]>();
  readonly unreadCount = input.required<number>();

  readonly toggleRequested = output<void>();
  readonly refreshRequested = output<void>();
  readonly itemRead = output<NotificationReadEvent>();

  readonly badgeLabel = computed(() => (this.unreadCount() > 9 ? '9+' : `${this.unreadCount()}`));
  readonly triggerLabel = computed(() => {
    const unread = this.unreadCount();
    return unread > 0 ? `Notificações (${unread} não lidas)` : 'Notificações';
  });

  trackNotification(index: number, item: NotificationItem): string {
    return item.id || `${item.title}-${item.createdAt}-${index}`;
  }

  markRead(item: NotificationItem, event?: Event): void {
    this.itemRead.emit({ item, event });
  }
}
