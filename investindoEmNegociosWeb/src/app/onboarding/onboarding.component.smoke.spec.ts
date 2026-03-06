import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { OnboardingComponent } from './onboarding.component';

class ProfileServiceMock {
  getProfile = jasmine.createSpy().and.returnValue(of(null));
  upsert = jasmine.createSpy().and.returnValue(of({}));
}

class OnboardingServiceMock {
  getStatus = jasmine.createSpy().and.returnValue(of({ step: 0, completed: false }));
  updateStatus = jasmine.createSpy().and.returnValue(of({ step: 0, completed: false }));
}

class UiFeedbackServiceMock {
  success = jasmine.createSpy();
  warning = jasmine.createSpy();
  error = jasmine.createSpy();
  info = jasmine.createSpy();
}

class AccountsServiceMock {
  list = jasmine.createSpy().and.returnValue(of([]));
  create = jasmine.createSpy().and.returnValue(of({ id: 'acc-1' }));
  setDefaultAccountId = jasmine.createSpy();
  resolveDefaultAccountId = jasmine.createSpy().and.returnValue(null);
}

class CardsServiceMock {
  list = jasmine.createSpy().and.returnValue(of([]));
}

class PlansServiceMock {
  create = jasmine.createSpy().and.returnValue(of({}));
}

class CategoriesServiceMock {
  list = jasmine.createSpy().and.returnValue(of([]));
}

class RouterMock {
  navigateByUrl = jasmine.createSpy().and.resolveTo(true);
}

function createComponent() {
  const profile = new ProfileServiceMock();
  const onboarding = new OnboardingServiceMock();
  const ui = new UiFeedbackServiceMock();
  const accounts = new AccountsServiceMock();
  const cards = new CardsServiceMock();
  const plans = new PlansServiceMock();
  const categories = new CategoriesServiceMock();
  const router = new RouterMock();

  const component = new OnboardingComponent(
    new FormBuilder(),
    profile as any,
    router as any,
    onboarding as any,
    ui as any,
    accounts as any,
    cards as any,
    plans as any,
    categories as any
  );

  return { component, profile, onboarding, ui, accounts, cards, plans, categories, router };
}

describe('OnboardingComponent smoke', () => {
  it('deve redirecionar para dashboard quando onboarding já estiver concluído', () => {
    const ctx = createComponent();
    ctx.onboarding.getStatus.and.returnValue(of({ step: 2, completed: true }));

    ctx.component.ngOnInit();

    expect(ctx.router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('deve bloquear submit sem objetivo selecionado', () => {
    const ctx = createComponent();
    ctx.component.form.patchValue({
      fullName: 'Tiago Teste',
      document: '015.876.104-93',
      phone: '(81) 99525-7823',
      birthDate: '1991-03-02',
      city: 'Recife',
      state: 'PE',
      country: 'Brasil'
    });

    ctx.component.submit();

    expect(ctx.ui.warning).toHaveBeenCalled();
    expect(ctx.profile.upsert).not.toHaveBeenCalled();
  });

  it('deve salvar passo 1 com payload completo e avançar para passo 2', () => {
    const ctx = createComponent();
    ctx.component.selectFocus('vida-financeira');
    ctx.component.intelligenceMode = 'C';
    ctx.component.carryOverDay = 15;
    ctx.component.form.patchValue({
      fullName: 'Tiago Teste',
      document: '015.876.104-93',
      phone: '(81) 99525-7823',
      birthDate: '1991-03-02',
      city: 'Recife',
      state: 'PE',
      country: 'Brasil'
    });

    ctx.component.submit();

    expect(ctx.profile.upsert).toHaveBeenCalled();
    const payload = ctx.profile.upsert.calls.mostRecent().args[0];
    expect(payload.fullName).toBe('Tiago Teste');
    expect(payload.financialGoal).toBe('vida-financeira');
    expect(payload.intelligenceMode).toBe('C');
    expect(payload.carryOverDay).toBe(15);
    expect(ctx.component.step).toBe(1);
    expect(ctx.onboarding.updateStatus).toHaveBeenCalledWith({ step: 1, completed: false });
  });

  it('deve tratar erro 401 no submit redirecionando para login', () => {
    const ctx = createComponent();
    ctx.component.selectFocus('sair-dividas');
    ctx.component.form.patchValue({
      fullName: 'Tiago Teste',
      document: '015.876.104-93',
      phone: '(81) 99525-7823',
      birthDate: '1991-03-02',
      city: 'Recife',
      state: 'PE',
      country: 'Brasil'
    });
    ctx.profile.upsert.and.returnValue(throwError(() => ({ status: 401 })));

    ctx.component.submit();

    expect(ctx.router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('deve criar conta no passo 2 e marcar accountReady', () => {
    const ctx = createComponent();
    ctx.component.accountForm.name = 'Conta principal';
    ctx.component.accountForm.type = 'Checking';

    ctx.component.createAccount();

    expect(ctx.accounts.create).toHaveBeenCalled();
    expect(ctx.accounts.setDefaultAccountId).toHaveBeenCalledWith('acc-1');
    expect(ctx.component.accountReady).toBeTrue();
  });

  it('deve bloquear conclusão do passo 3 sem conta e sem lançamentos iniciais', () => {
    const ctx = createComponent();
    ctx.component.step = 2;
    ctx.component.accountReady = false;

    ctx.component.saveInitialEntriesAndFinish();

    expect(ctx.ui.warning).toHaveBeenCalled();
    expect(ctx.component.step).toBe(1);
    expect(ctx.router.navigateByUrl).not.toHaveBeenCalledWith('/dashboard');
  });

  it('deve concluir onboarding quando conta e lançamentos iniciais estiverem preenchidos', () => {
    const ctx = createComponent();
    ctx.component.step = 2;
    ctx.component.accountReady = true;
    ctx.component.initialIncome = { source: 'Salário', amount: 5000, receivedOn: '2026-03-05' };
    ctx.component.initialExpense = { name: 'Aluguel', amount: 1500, dueDate: '2026-03-10', categoryId: null };

    ctx.component.saveInitialEntriesAndFinish();

    expect(ctx.onboarding.updateStatus).toHaveBeenCalledWith({ step: 2, completed: true });
    expect(ctx.router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
});
