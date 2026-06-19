import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppSessionFacadeService } from './app-session-facade.service';
import { AuthService } from './auth.service';
import { SessionMonitorService } from './session-monitor.service';

describe('AppSessionFacadeService', () => {
  let service: AppSessionFacadeService;
  let authService: jasmine.SpyObj<Pick<AuthService, 'clearSession' | 'getRole' | 'isAuthenticated'>>;
  let sessionMonitor: jasmine.SpyObj<Pick<SessionMonitorService, 'markActivity' | 'start' | 'stop'>>;
  let router: Pick<Router, 'navigated' | 'url'>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<Pick<AuthService, 'clearSession' | 'getRole' | 'isAuthenticated'>>(
      'AuthService',
      ['clearSession', 'getRole', 'isAuthenticated']
    );
    sessionMonitor = jasmine.createSpyObj<Pick<SessionMonitorService, 'markActivity' | 'start' | 'stop'>>(
      'SessionMonitorService',
      ['markActivity', 'start', 'stop']
    );
    router = { navigated: true, url: '/' };

    TestBed.configureTestingModule({
      providers: [
        AppSessionFacadeService,
        { provide: AuthService, useValue: authService },
        { provide: SessionMonitorService, useValue: sessionMonitor },
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    service = TestBed.inject(AppSessionFacadeService);
    history.pushState({}, '', '/');
  });

  afterEach(() => {
    history.pushState({}, '', '/');
  });

  it('inicia monitoramento com verificador de rota protegida', () => {
    const onExpired = jasmine.createSpy('onExpired');

    service.startMonitoring(onExpired);

    const options = sessionMonitor.start.calls.mostRecent().args[0];
    history.pushState({}, '', '/dashboard');
    expect(options.isProtectedRoute()).toBeTrue();
    history.pushState({}, '', '/login');
    expect(options.isProtectedRoute()).toBeFalse();

    options.onSessionExpired();
    expect(onExpired).toHaveBeenCalled();
  });

  it('retorna nao autenticado em rota protegida', () => {
    authService.isAuthenticated.and.returnValue(false);
    history.pushState({}, '', '/dashboard');

    expect(service.isAuthenticated()).toBeFalse();
  });

  it('mantem experiencia publica em rota publica navegada', () => {
    authService.isAuthenticated.and.returnValue(false);
    history.pushState({}, '', '/planos');

    expect(service.showPublicExperience()).toBeTrue();
  });

  it('centraliza role e verificacao de acesso', () => {
    authService.getRole.and.returnValue('Intermediate');

    expect(service.getCurrentRole()).toBe('Intermediate');
    expect(service.hasAccess('Basic')).toBeTrue();
    expect(service.hasAccess('Advanced')).toBeFalse();
  });
});
