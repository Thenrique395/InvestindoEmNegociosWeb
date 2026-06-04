import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PublicNavigationService } from './public-navigation.service';

describe('PublicNavigationService', () => {
  let service: PublicNavigationService;
  let router: jasmine.SpyObj<Pick<Router, 'navigate' | 'navigateByUrl'>>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Pick<Router, 'navigate' | 'navigateByUrl'>>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        PublicNavigationService,
        { provide: Router, useValue: router }
      ]
    });

    service = TestBed.inject(PublicNavigationService);
    history.pushState({}, '', '/');
  });

  afterEach(() => {
    history.pushState({}, '', '/');
  });

  it('volta para o topo quando ja esta na home publica', () => {
    const event = jasmine.createSpyObj<Event>('Event', ['preventDefault']);
    const scrollTo = spyOn(window, 'scrollTo');
    spyOn(window.history, 'replaceState');
    spyOn(window, 'setTimeout').and.callFake(((handler: TimerHandler, _timeout?: number, ...args: unknown[]) => {
      if (typeof handler === 'function') handler(...args);
      return 0;
    }) as typeof window.setTimeout);

    service.goToPublicHome('/', true, event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/');
    expect(scrollTo.calls.allArgs()).toContain(jasmine.objectContaining([{ top: 0, behavior: 'auto' }]));
  });

  it('navega para home antes de rolar para secao quando esta em outra rota', async () => {
    const event = jasmine.createSpyObj<Event>('Event', ['preventDefault']);
    const scrollTo = spyOn(window, 'scrollTo');
    spyOn(window.history, 'pushState');
    spyOn(window, 'setTimeout').and.callFake(((handler: TimerHandler, _timeout?: number, ...args: unknown[]) => {
      if (typeof handler === 'function') handler(...args);
      return 0;
    }) as typeof window.setTimeout);
    const section = document.createElement('section');
    section.id = 'recursos';
    spyOn(section, 'getBoundingClientRect').and.returnValue({
      top: 120,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 120,
      toJSON: () => ({})
    });
    document.body.appendChild(section);

    service.scrollToPublicSection('recursos', '/login', true, event);
    await router.navigate.calls.mostRecent().returnValue;

    expect(event.preventDefault).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/#recursos');
    expect(scrollTo.calls.allArgs()).toContain(jasmine.objectContaining([{ top: 48, behavior: 'smooth' }]));

    section.remove();
  });

  it('ignora scroll quando nao esta em browser', () => {
    const scrollTo = spyOn(window, 'scrollTo');

    service.scrollToElement('qualquer', false);
    service.scrollToPublicTop(false);

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
