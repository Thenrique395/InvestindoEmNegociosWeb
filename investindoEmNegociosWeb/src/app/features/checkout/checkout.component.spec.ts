import { FormBuilder } from '@angular/forms';
import { convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CheckoutComponent } from './checkout.component';

class TitleMock {
  setTitle = jasmine.createSpy('setTitle');
}

class MetaMock {
  updateTag = jasmine.createSpy('updateTag');
  removeTag = jasmine.createSpy('removeTag');
}

function createComponent(queryParams: Record<string, string> = {}) {
  const route = { queryParamMap: of(convertToParamMap(queryParams)) } as any;
  const router = { navigate: jasmine.createSpy('navigate') } as any;
  const authService = {
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
    getUserName: jasmine.createSpy('getUserName').and.returnValue('Joanna Amanda'),
    getUserEmail: jasmine.createSpy('getUserEmail').and.returnValue('joanna@example.com'),
    getRole: jasmine.createSpy('getRole').and.returnValue('Intermediate'),
    applySession: jasmine.createSpy('applySession'),
    checkAvailability: jasmine.createSpy('checkAvailability').and.returnValue(of({ emailExists: false, documentExists: false })),
    register: jasmine.createSpy('register').and.returnValue(of({}))
  } as any;
  const billingService = {
    startCheckout: jasmine.createSpy('startCheckout').and.returnValue(of({ checkoutId: 'id-1', checkoutUrl: '' }))
  } as any;
  const checkoutIntent = {
    save: jasmine.createSpy('save'),
    clear: jasmine.createSpy('clear')
  } as any;
  const subscriptionsService = {
    change: jasmine.createSpy('change').and.returnValue(of({ session: {}, current: { planName: 'Essencial' } }))
  } as any;
  const uiFeedback = {
    success: jasmine.createSpy('success'),
    warning: jasmine.createSpy('warning'),
    error: jasmine.createSpy('error')
  } as any;
  const title = new TitleMock();
  const meta = new MetaMock();

  const component = new CheckoutComponent(
    route,
    router,
    authService,
    billingService,
    checkoutIntent,
    subscriptionsService,
    uiFeedback,
    new FormBuilder(),
    title as any,
    meta as any,
    { onDestroy: () => {} } as any
  );

  return { component, route, router, authService, billingService, checkoutIntent, subscriptionsService, uiFeedback, title, meta };
}

describe('CheckoutComponent', () => {
  it('seleciona o plano Controle por padrão quando nenhum plano é informado na URL', () => {
    const { component } = createComponent();
    expect(component.selectedPlan.code).toBe('intermediate');
    expect(component.selectedCycle).toBe('Monthly');
  });

  it('lê o plano e a periodicidade a partir dos query params', () => {
    const { component } = createComponent({ plan: 'basic', cycle: 'Yearly' });
    expect(component.selectedPlan.code).toBe('basic');
    expect(component.selectedCycle).toBe('Yearly');
  });

  it('define o título e a descrição de checkout, com noindex', () => {
    const { title, meta } = createComponent();
    expect(title.setTitle).toHaveBeenCalledWith('Finalizar assinatura — Investindo em Negócios');
    expect(meta.updateTag).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'robots', content: 'noindex, nofollow' }));
  });

  it('restaura título, descrição e remove o noindex ao destruir', () => {
    const { component, title, meta } = createComponent();
    title.setTitle.calls.reset();
    meta.updateTag.calls.reset();

    component.ngOnDestroy();

    expect(title.setTitle).toHaveBeenCalledWith(jasmine.stringMatching(/Investindo em Negócios/));
    expect(meta.removeTag).toHaveBeenCalledWith("name='robots'");
  });

  it('calcula o preço selecionado conforme a periodicidade', () => {
    const { component } = createComponent({ plan: 'intermediate', cycle: 'Monthly' });
    expect(component.selectedPrice).toBe(component.selectedPlan.monthlyPrice);

    component.selectedCycle = 'Yearly';
    expect(component.selectedPrice).toBe(component.selectedPlan.yearlyPrice);
  });

  it('não inclui a etapa de pagamento no stepper do plano gratuito', () => {
    const { component } = createComponent({ plan: 'basic' });
    const labels = component.stepperItems.map((item) => item.label);

    expect(labels).toEqual(['Plano', 'Sua conta', 'Ativação']);
    expect(component.paymentStepNumber).toBeNull();
    expect(component.confirmationStepNumber).toBe(3);
  });

  it('inclui a etapa de pagamento no stepper de planos pagos', () => {
    const { component } = createComponent({ plan: 'intermediate' });
    const labels = component.stepperItems.map((item) => item.label);

    expect(labels).toEqual(['Plano', 'Sua conta', 'Pagamento', 'Confirmação']);
    expect(component.paymentStepNumber).toBe(3);
    expect(component.confirmationStepNumber).toBe(4);
  });

  it('mascara o CPF digitado e reseta a checagem de disponibilidade', () => {
    const { component } = createComponent();
    component.accountExists = true;
    component.showRegistrationFields = true;

    const input = document.createElement('input');
    input.value = '12345678900';
    component.onAccountCpfInput({ target: input } as unknown as Event);

    expect(component.accountForm.get('cpf')?.value).toBe('123.456.789-00');
    expect(component.accountExists).toBeFalse();
    expect(component.showRegistrationFields).toBeFalse();
  });

  it('avisa e não consulta disponibilidade quando os campos obrigatórios estão inválidos', () => {
    const { component, authService, uiFeedback } = createComponent();

    component.checkAccount();

    expect(uiFeedback.warning).toHaveBeenCalled();
    expect(authService.checkAvailability).not.toHaveBeenCalled();
  });

  it('revela os campos de registro quando e-mail e CPF estão disponíveis', () => {
    const { component } = createComponent();
    component.accountForm.setValue({
      nome: 'Joanna Amanda',
      email: 'joanna@example.com',
      cpf: '111.444.777-35',
      senha: '',
      confirmarSenha: '',
      aceitarTermos: false
    });

    component.checkAccount();

    expect(component.accountExists).toBeFalse();
    expect(component.showRegistrationFields).toBeTrue();
  });

  it('sinaliza conta existente quando e-mail já está em uso', () => {
    const { component, authService } = createComponent();
    authService.checkAvailability.and.returnValue(of({ emailExists: true, documentExists: false }));
    component.accountForm.setValue({
      nome: 'Joanna Amanda',
      email: 'joanna@example.com',
      cpf: '111.444.777-35',
      senha: '',
      confirmarSenha: '',
      aceitarTermos: false
    });

    component.checkAccount();

    expect(component.accountExists).toBeTrue();
    expect(component.showRegistrationFields).toBeFalse();
    expect(component.accountForm.get('email')?.hasError('emailInUse')).toBeTrue();
  });

  it('acusa senhas diferentes como erro de formulário', () => {
    const { component } = createComponent();
    component.accountForm.patchValue({ senha: 'abcdef', confirmarSenha: 'ghijkl' });
    component.accountForm.get('confirmarSenha')?.markAsTouched();

    expect(component.hasAccountPasswordMismatch()).toBeTrue();
  });

  it('redireciona para login ao tentar ativar um plano sem estar autenticado', () => {
    const { component, router } = createComponent({ plan: 'basic' });

    component.activatePlan();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/login'],
      jasmine.objectContaining({ queryParams: jasmine.objectContaining({ returnTo: '/checkout', plan: 'basic' }) })
    );
  });

  it('ativa o plano gratuito diretamente quando o usuário já está autenticado', () => {
    const { component, authService, subscriptionsService, router, checkoutIntent } = createComponent({ plan: 'basic' });
    authService.isAuthenticated.and.returnValue(true);

    component.activatePlan();

    expect(subscriptionsService.change).toHaveBeenCalledWith('basic', 'Monthly');
    expect(authService.applySession).toHaveBeenCalled();
    expect(checkoutIntent.clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/checkout/sucesso'],
      jasmine.objectContaining({ queryParams: jasmine.objectContaining({ plan: 'basic' }) })
    );
  });

  it('envia para falha de checkout quando a ativação do plano gratuito falha', () => {
    const { component, authService, subscriptionsService, router } = createComponent({ plan: 'basic' });
    authService.isAuthenticated.and.returnValue(true);
    subscriptionsService.change.and.returnValue(throwError(() => new Error('falhou')));

    component.activatePlan();

    expect(router.navigate).toHaveBeenCalledWith(['/checkout/falha'], jasmine.anything());
  });

  it('inicia o checkout de cobrança para planos pagos quando autenticado', () => {
    const { component, authService, billingService } = createComponent({ plan: 'intermediate' });
    authService.isAuthenticated.and.returnValue(true);

    component.activatePlan();

    expect(billingService.startCheckout).toHaveBeenCalledWith('intermediate', 'Monthly');
  });
});
