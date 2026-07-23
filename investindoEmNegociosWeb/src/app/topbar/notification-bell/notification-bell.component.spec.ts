import { TestBed } from '@angular/core/testing';
import { NotificationBellComponent } from './notification-bell.component';

function bell(count: number): NotificationBellComponent {
  const fixture = TestBed.createComponent(NotificationBellComponent);
  fixture.componentRef.setInput('unreadCount', count);
  return fixture.componentInstance;
}

describe('NotificationBellComponent — badge de não lidas', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [NotificationBellComponent] }));

  it('badgeLabel mostra o número, com teto "9+"', () => {
    expect(bell(0).badgeLabel()).toBe('0');
    expect(bell(5).badgeLabel()).toBe('5');
    expect(bell(9).badgeLabel()).toBe('9');
    expect(bell(10).badgeLabel()).toBe('9+');
    expect(bell(150).badgeLabel()).toBe('9+');
  });

  it('triggerLabel (aria) reflete a contagem de não lidas', () => {
    expect(bell(0).triggerLabel()).toBe('Notificações');
    expect(bell(3).triggerLabel()).toBe('Notificações (3 não lidas)');
  });
});
