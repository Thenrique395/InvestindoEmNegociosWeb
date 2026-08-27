import { of, throwError } from 'rxjs';
import { AdminParametersComponent } from './admin-parameters.component';
import { resolveApiErrorMessage } from '../utils/api-error.mapper';

describe('AdminParametersComponent', () => {
  function createComponent(overrides?: { adminParameters?: any; uiFeedback?: any }) {
    const adminParameters = overrides?.adminParameters ?? {
      listCardBrands: jasmine.createSpy().and.returnValue(of([{ id: 2, name: 'Visa', code: 'visa', isActive: true }])),
      listPaymentMethods: jasmine.createSpy().and.returnValue(of([{ id: 1, name: 'Pix', isActive: true }])),
      listInstitutions: jasmine.createSpy().and.returnValue(of([{ id: 1, name: 'XP', type: 'Broker', isActive: true }])),
      getNotificationSettings: jasmine.createSpy().and.returnValue(of({
        incomeUpcomingEnabled: true,
        incomeDaysBefore: 2,
        expenseUpcomingEnabled: true,
        expenseDaysBefore: 2,
        expenseOverdueEnabled: true,
        cardCloseSoonEnabled: true,
        cardCloseDaysBefore: 2,
        cardCloseDayEnabled: true,
        monthCloseEnabled: true,
        monthSummaryEnabled: true,
        goalBelowExpectedEnabled: true,
        goalCompletedEnabled: true,
        goalInactivityEnabled: true,
        goalInactivityDays: 30
      })),
      getRobotSettings: jasmine.createSpy().and.returnValue(of({ enabled: true, dailyRunTimeUtc: '08:00' })),
      getScalabilityRuntime: jasmine.createSpy().and.returnValue(of({
        currentPhase: 'phase-1-runtime-hardened',
        enabledControls: ['memory cache'],
        nextPhaseTargets: ['redis'],
        longTermTargets: ['dw']
      })),
      createCardBrand: jasmine.createSpy().and.returnValue(of({ id: 1, name: 'Master', code: 'master', isActive: true })),
      createPaymentMethod: jasmine.createSpy().and.returnValue(of({ id: 2, name: 'Boleto', isActive: true })),
      createInstitution: jasmine.createSpy().and.returnValue(of({ id: 2, name: 'Inter', type: 'Bank', isActive: true })),
      updateNotificationSettings: jasmine.createSpy().and.returnValue(of({ goalCompletedEnabled: false })),
      updateRobotSettings: jasmine.createSpy().and.returnValue(of({ enabled: true, dailyRunTimeUtc: '09:00' })),
      sendTestEmail: jasmine.createSpy().and.returnValue(of({ to: 'a@a.com', sentAtUtc: '2026-03-09T12:00:00Z' })),
      updateCardBrandStatus: jasmine.createSpy().and.returnValue(of({ id: 2, name: 'Visa', code: 'visa', isActive: true })),
      updatePaymentMethodStatus: jasmine.createSpy().and.returnValue(of({ id: 1, name: 'Pix', isActive: false })),
      updateInstitutionStatus: jasmine.createSpy().and.returnValue(of({ id: 1, name: 'XP', type: 'Broker', isActive: false }))
    };
    const uiFeedback = overrides?.uiFeedback ?? {
      success: jasmine.createSpy(),
      error: jasmine.createSpy(),
      warning: jasmine.createSpy()
    };

    return {
      component: new AdminParametersComponent(adminParameters, uiFeedback, { onDestroy: () => {} } as any),
      adminParameters,
      uiFeedback
    };
  }

  it('deve carregar todos os blocos ao iniciar', () => {
    const { component } = createComponent();

    component.ngOnInit();

    expect(component.cardBrands.length).toBe(1);
    expect(component.paymentMethods.length).toBe(1);
    expect(component.institutions.length).toBe(1);
    expect(component.scalabilityRuntime?.currentPhase).toBe('phase-1-runtime-hardened');
    expect(component.loading).toBeFalse();
  });

  it('deve avisar quando escalabilidade falhar sem quebrar a carga', () => {
    const uiFeedback = { success: jasmine.createSpy(), error: jasmine.createSpy(), warning: jasmine.createSpy() };
    const { component } = createComponent({
      adminParameters: {
        listCardBrands: jasmine.createSpy().and.returnValue(of([])),
        listPaymentMethods: jasmine.createSpy().and.returnValue(of([])),
        listInstitutions: jasmine.createSpy().and.returnValue(of([])),
        getNotificationSettings: jasmine.createSpy().and.returnValue(of(null)),
        getRobotSettings: jasmine.createSpy().and.returnValue(of(null)),
        getScalabilityRuntime: jasmine.createSpy().and.returnValue(throwError(() => ({ status: 500 })))
      },
      uiFeedback
    });

    component.loadAll();

    expect(uiFeedback.warning).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('deve validar nome e código ao criar bandeira', () => {
    const { component, adminParameters, uiFeedback } = createComponent();

    component.createCardBrand();

    expect(adminParameters.createCardBrand).not.toHaveBeenCalled();
    expect(uiFeedback.warning).toHaveBeenCalled();
  });

  it('deve criar bandeira com sucesso', () => {
    const { component, uiFeedback } = createComponent();
    component.cardBrands = [{ id: 3, name: 'Visa', code: 'visa', isActive: true }];
    component.newBrandName = 'Master';
    component.newBrandCode = 'master';

    component.createCardBrand();

    expect(component.cardBrands.map((item) => item.id)).toEqual([1, 3]);
    expect(component.newBrandName).toBe('');
    expect(component.newBrandCode).toBe('');
    expect(uiFeedback.success).toHaveBeenCalled();
  });

  it('deve validar nome ao criar forma de pagamento', () => {
    const { component, adminParameters, uiFeedback } = createComponent();

    component.createPaymentMethod();

    expect(adminParameters.createPaymentMethod).not.toHaveBeenCalled();
    expect(uiFeedback.warning).toHaveBeenCalled();
  });

  it('deve validar nome ao criar instituição', () => {
    const { component, adminParameters, uiFeedback } = createComponent();

    component.createInstitution();

    expect(adminParameters.createInstitution).not.toHaveBeenCalled();
    expect(uiFeedback.warning).toHaveBeenCalled();
  });

  it('deve bloquear horário inválido dos robôs', () => {
    const { component, adminParameters, uiFeedback } = createComponent();
    component.robotSettings.dailyRunTimeUtc = '9h';

    component.salvarRobotSettings();

    expect(adminParameters.updateRobotSettings).not.toHaveBeenCalled();
    expect(uiFeedback.warning).toHaveBeenCalled();
  });

  it('deve validar e-mail vazio para teste SMTP', () => {
    const { component, adminParameters, uiFeedback } = createComponent();

    component.enviarEmailTeste();

    expect(adminParameters.sendTestEmail).not.toHaveBeenCalled();
    expect(uiFeedback.warning).toHaveBeenCalled();
  });

  it('deve filtrar listas por texto', () => {
    const { component } = createComponent();
    component.cardBrands = [
      { id: 1, name: 'Visa', code: 'visa', isActive: true },
      { id: 2, name: 'Master', code: 'master', isActive: true }
    ];
    component.brandFilter = 'mast';

    expect(component.filteredCardBrands.map((item) => item.id)).toEqual([2]);
  });

  it('deve abrir confirmação ao desativar bandeira', () => {
    const { component, adminParameters } = createComponent();
    const brand = { id: 1, name: 'Visa', code: 'visa', isActive: true };

    component.toggleCardBrand(brand);

    expect(component.confirmOpen).toBeTrue();
    expect(adminParameters.updateCardBrandStatus).not.toHaveBeenCalled();
  });

  it('deve aplicar ação pendente ao confirmar', () => {
    const { component, adminParameters } = createComponent();
    const brand = { id: 1, name: 'Visa', code: 'visa', isActive: true };
    component.toggleCardBrand(brand);

    component.confirmAction();

    expect(adminParameters.updateCardBrandStatus).toHaveBeenCalledWith(1, false);
  });

  it('deve cancelar confirmação pendente', () => {
    const { component } = createComponent();
    component.toggleInstitution({ id: 1, name: 'XP', type: 'Broker', isActive: true });

    component.cancelConfirm();

    expect(component.confirmOpen).toBeFalse();
  });

  it('deve formatar erro de conexão', () => {
    expect(resolveApiErrorMessage({ status: 0 }, 'fallback')).toBe('Falha de conexão com o servidor.');
  });

  it('deve reverter toggle de forma de pagamento quando a API falhar', () => {
    const uiFeedback = { success: jasmine.createSpy(), error: jasmine.createSpy(), warning: jasmine.createSpy() };
    const { component } = createComponent({
      adminParameters: {
        listCardBrands: jasmine.createSpy().and.returnValue(of([])),
        listPaymentMethods: jasmine.createSpy().and.returnValue(of([])),
        listInstitutions: jasmine.createSpy().and.returnValue(of([])),
        getNotificationSettings: jasmine.createSpy().and.returnValue(of(null)),
        getRobotSettings: jasmine.createSpy().and.returnValue(of(null)),
        getScalabilityRuntime: jasmine.createSpy().and.returnValue(of(null)),
        updatePaymentMethodStatus: jasmine.createSpy().and.returnValue(throwError(() => ({ status: 500 })))
      },
      uiFeedback
    });
    const method = { id: 10, name: 'Pix', isActive: true };

    (component as any).applyTogglePaymentMethod(method, false);

    expect(method.isActive).toBeTrue();
    expect(uiFeedback.error).toHaveBeenCalled();
  });
});
