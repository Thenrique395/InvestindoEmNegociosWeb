import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NotificationItem, NotificationsService } from './notifications.service';

export type NotificationsState = {
  open: boolean;
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string;
};

const initialState: NotificationsState = {
  open: false,
  items: [],
  unreadCount: 0,
  loading: false,
  error: ''
};

@Injectable({ providedIn: 'root' })
export class NotificationsFacadeService {
  private readonly notificationsService = inject(NotificationsService);
  private readonly stateSubject = new BehaviorSubject<NotificationsState>(initialState);

  readonly state$ = this.stateSubject.asObservable();

  toggle(): void {
    const nextOpen = !this.current.open;
    this.patch({ open: nextOpen });

    if (nextOpen && !this.current.items.length) {
      this.fetch();
    }
  }

  close(): void {
    if (this.current.open) {
      this.patch({ open: false });
    }
  }

  reset(): void {
    this.stateSubject.next(initialState);
  }

  refresh(): void {
    this.patch({ error: '', loading: true });
    this.notificationsService.generate().subscribe({
      next: () => this.fetch(),
      error: () => {
        this.patch({ error: 'Falha ao atualizar.' });
        this.fetch();
      }
    });
  }

  markRead(item: NotificationItem, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (item.readAt) return;

    this.notificationsService.markRead(item.id).subscribe({
      next: () => {
        const readAt = new Date().toISOString();
        const items = this.current.items.map((notification) => (
          notification.id === item.id ? { ...notification, readAt } : notification
        ));
        this.patch({ items, unreadCount: this.countUnread(items) });
      },
      error: () => {
        /* ignore */
      }
    });
  }

  fetch(): void {
    this.patch({ loading: true });
    this.notificationsService.list(false, 20).subscribe({
      next: (items) => {
        const safeItems = items || [];
        this.patch({
          items: safeItems,
          unreadCount: this.countUnread(safeItems),
          error: ''
        });
      },
      error: () => {
        this.patch({
          items: [],
          unreadCount: 0,
          loading: false,
          error: 'Não foi possível carregar.'
        });
      },
      complete: () => {
        this.patch({ loading: false });
      }
    });
  }

  private get current(): NotificationsState {
    return this.stateSubject.value;
  }

  private patch(partial: Partial<NotificationsState>): void {
    this.stateSubject.next({ ...this.current, ...partial });
  }

  private countUnread(items: NotificationItem[]): number {
    return items.filter((notification) => !notification.readAt).length;
  }
}
