import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NotificationItem, NotificationsService } from './notifications.service';
import { NotificationsFacadeService } from './notifications-facade.service';

describe('NotificationsFacadeService', () => {
  let service: NotificationsFacadeService;
  let notificationsService: jasmine.SpyObj<Pick<NotificationsService, 'generate' | 'list' | 'markRead'>>;

  const unread: NotificationItem = {
    id: 'n-1',
    title: 'Conta vencendo',
    message: 'Sua conta vence hoje.',
    kind: 'ExpenseUpcoming',
    dueDate: '2026-06-04',
    readAt: null,
    createdAt: '2026-06-04T10:00:00Z'
  };

  const read: NotificationItem = {
    ...unread,
    id: 'n-2',
    readAt: '2026-06-04T11:00:00Z'
  };

  beforeEach(() => {
    notificationsService = jasmine.createSpyObj<Pick<NotificationsService, 'generate' | 'list' | 'markRead'>>(
      'NotificationsService',
      ['generate', 'list', 'markRead']
    );
    notificationsService.generate.and.returnValue(of({ created: 1 }));
    notificationsService.list.and.returnValue(of([unread, read]));
    notificationsService.markRead.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      providers: [
        NotificationsFacadeService,
        { provide: NotificationsService, useValue: notificationsService }
      ]
    });

    service = TestBed.inject(NotificationsFacadeService);
  });

  it('abre e busca notificacoes ao alternar aberto sem itens', () => {
    const states = subscribeStates();

    service.toggle();

    expect(notificationsService.list).toHaveBeenCalledWith(false, 20);
    expect(states.at(-1)).toEqual({
      open: true,
      items: [unread, read],
      unreadCount: 1,
      loading: false,
      error: ''
    });
  });

  it('atualiza notificacoes gerando e buscando lista', () => {
    const states = subscribeStates();

    service.refresh();

    expect(notificationsService.generate).toHaveBeenCalled();
    expect(notificationsService.list).toHaveBeenCalledWith(false, 20);
    expect(states.at(-1)?.items).toEqual([unread, read]);
    expect(states.at(-1)?.unreadCount).toBe(1);
  });

  it('marca uma notificacao como lida e recalcula contador', () => {
    const states = subscribeStates();
    service.fetch();

    service.markRead(unread);

    expect(notificationsService.markRead).toHaveBeenCalledWith('n-1');
    expect(states.at(-1)?.items[0].readAt).toBeTruthy();
    expect(states.at(-1)?.unreadCount).toBe(0);
  });

  it('mantem estado vazio com mensagem quando listagem falha', () => {
    notificationsService.list.and.returnValue(throwError(() => new Error('falha')));
    const states = subscribeStates();

    service.fetch();

    expect(states.at(-1)).toEqual({
      open: false,
      items: [],
      unreadCount: 0,
      loading: false,
      error: 'Não foi possível carregar.'
    });
  });

  function subscribeStates() {
    const states: Array<{
      open: boolean;
      items: NotificationItem[];
      unreadCount: number;
      loading: boolean;
      error: string;
    }> = [];
    service.state$.subscribe((state) => states.push(state));
    return states;
  }
});
