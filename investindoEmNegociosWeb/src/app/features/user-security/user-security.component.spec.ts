import { of, throwError } from 'rxjs';
import { UserSecurityComponent } from './user-security.component';

describe('UserSecurityComponent', () => {
  function createComponent(overrides?: { profileService?: any; uiFeedback?: any }) {
    const profileService = overrides?.profileService ?? {
      getSecuritySummary: jasmine.createSpy().and.returnValue(of({
        activeSessions: 2,
        failedLoginAttempts: 1,
        isLocked: false,
        lockoutUntil: null,
        lastLoginAt: '2026-03-14T10:00:00Z',
        controls: ['jwt'],
        recommendations: ['revogue sessões']
      })),
      revokeOwnSessions: jasmine.createSpy().and.returnValue(of({ revokedSessions: 2, revokedAtUtc: '2026-03-14T10:00:00Z' }))
    };
    const uiFeedback = overrides?.uiFeedback ?? {
      success: jasmine.createSpy(),
      error: jasmine.createSpy()
    };

    return {
      component: new UserSecurityComponent(profileService, uiFeedback, { onDestroy: () => {} } as any),
      profileService,
      uiFeedback
    };
  }

  it('deve carregar resumo ao iniciar', () => {
    const ctx = createComponent();

    expect(ctx.profileService.getSecuritySummary).toHaveBeenCalled();
    expect(ctx.component.summary?.activeSessions).toBe(2);
  });

  it('deve abrir a confirmação antes de revogar sessões', () => {
    const ctx = createComponent();

    ctx.component.revokeSessions();

    expect(ctx.component.confirmRevokeOpen).toBeTrue();
    expect(ctx.profileService.revokeOwnSessions).not.toHaveBeenCalled();
  });

  it('deve revogar sessões e recarregar o resumo após confirmação', () => {
    const ctx = createComponent();

    ctx.component.performRevokeSessions();

    expect(ctx.component.confirmRevokeOpen).toBeFalse();
    expect(ctx.profileService.revokeOwnSessions).toHaveBeenCalled();
    expect(ctx.profileService.getSecuritySummary).toHaveBeenCalledTimes(2);
    expect(ctx.uiFeedback.success).toHaveBeenCalled();
  });

  it('deve exibir erro se a revogação falhar', () => {
    const profileService = {
      getSecuritySummary: jasmine.createSpy().and.returnValue(of({
        activeSessions: 1,
        failedLoginAttempts: 0,
        isLocked: false,
        lockoutUntil: null,
        lastLoginAt: null,
        controls: [],
        recommendations: []
      })),
      revokeOwnSessions: jasmine.createSpy().and.returnValue(throwError(() => ({ error: { detail: 'Falha' } })))
    };
    const uiFeedback = { success: jasmine.createSpy(), error: jasmine.createSpy() };
    const ctx = createComponent({ profileService, uiFeedback });

    ctx.component.performRevokeSessions();

    expect(uiFeedback.error).toHaveBeenCalledWith('Falha');
  });
});
