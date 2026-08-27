import { of, throwError } from 'rxjs';
import { UserDataComponent } from './user-data.component';

describe('UserDataComponent', () => {
  function createComponent(overrides?: {
    profileService?: any;
    authService?: any;
    router?: any;
    uiFeedback?: any;
  }) {
    const portabilityService = {
      exportData: jasmine.createSpy().and.returnValue(of({ headers: { get: () => null }, body: new Blob() })),
      importData: jasmine.createSpy().and.returnValue(of({ importedRecords: 1 }))
    };
    const profileService = overrides?.profileService ?? {
      getPrivacySummary: jasmine.createSpy().and.returnValue(of({
        activeSessions: 2,
        pendingPasswordResetRequests: 1,
        auditEntries: 3,
        dataExportEnabled: true,
        selfServiceDeletionEnabled: true,
        deletionScope: ['perfil'],
        productionControls: ['jwt'],
        retentionPolicy: 'ok'
      })),
      deleteOwnAccount: jasmine.createSpy().and.returnValue(of(void 0))
    };
    const authService = overrides?.authService ?? {
      clearSession: jasmine.createSpy()
    };
    const router = overrides?.router ?? {
      navigateByUrl: jasmine.createSpy()
    };
    const uiFeedback = overrides?.uiFeedback ?? {
      success: jasmine.createSpy(),
      error: jasmine.createSpy()
    };

    return {
      component: new UserDataComponent(portabilityService as any, profileService, authService, router, uiFeedback, { onDestroy: () => {} } as any),
      profileService,
      authService,
      router,
      uiFeedback
    };
  }

  it('deve carregar o resumo de privacidade ao iniciar', () => {
    const ctx = createComponent();

    expect(ctx.profileService.getPrivacySummary).toHaveBeenCalled();
    expect(ctx.component.privacySummary?.activeSessions).toBe(2);
    expect(ctx.component.privacyLoading).toBeFalse();
  });

  it('deve excluir conta e limpar a sessão quando a API responder com sucesso', () => {
    const ctx = createComponent();
    ctx.component.deletePayload = {
      currentPassword: 'Senha@123',
      confirmationText: 'EXCLUIR'
    };

    ctx.component.confirmDeleteAccount();

    expect(ctx.profileService.deleteOwnAccount).toHaveBeenCalledWith(ctx.component.deletePayload);
    expect(ctx.authService.clearSession).toHaveBeenCalled();
    expect(ctx.router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(ctx.uiFeedback.success).toHaveBeenCalled();
  });

  it('deve exibir erro quando a exclusão falhar', () => {
    const uiFeedback = {
      success: jasmine.createSpy(),
      error: jasmine.createSpy()
    };
    const profileService = {
      getPrivacySummary: jasmine.createSpy().and.returnValue(of({
        activeSessions: 0,
        pendingPasswordResetRequests: 0,
        auditEntries: 0,
        dataExportEnabled: true,
        selfServiceDeletionEnabled: true,
        deletionScope: [],
        productionControls: [],
        retentionPolicy: 'ok'
      })),
      deleteOwnAccount: jasmine.createSpy().and.returnValue(throwError(() => ({
        error: { detail: 'Senha inválida' }
      })))
    };
    const ctx = createComponent({ profileService, uiFeedback });
    ctx.component.deletePayload = {
      currentPassword: 'errada',
      confirmationText: 'EXCLUIR'
    };

    ctx.component.confirmDeleteAccount();

    expect(uiFeedback.error).toHaveBeenCalledWith('Senha inválida');
    expect(ctx.component.deletingAccount).toBeFalse();
  });
});
