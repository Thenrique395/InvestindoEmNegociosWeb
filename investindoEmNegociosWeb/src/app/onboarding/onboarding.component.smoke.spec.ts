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

class AuthServiceMock {
  getRole = jasmine.createSpy().and.returnValue('Basic');
  getUserName = jasmine.createSpy().and.returnValue('Tiago Cadastro');
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
  create = jasmine.createSpy().and.returnValue(of({ id: 'plan-novo' }));
  update = jasmine.createSpy().and.returnValue(of({ id: 'plan-existente' }));
  list = jasmine.createSpy().and.returnValue(of([]));
}

class CategoriesServiceMock {
  list = jasmine.createSpy().and.returnValue(of([]));
  invalidateCache = jasmine.createSpy();
}

const METODOS_PAGAMENTO = [
  { id: 1, code: 'pix', name: 'Pix' },
  { id: 2, code: 'credit', name: 'Cartão de crédito' },
  { id: 4, code: 'cash', name: 'Dinheiro' }
];

class LookupsServiceMock {
  paymentMethods = jasmine.createSpy().and.returnValue(of(METODOS_PAGAMENTO));
}

class UiPermissionsServiceMock {
  canReadCards = jasmine.createSpy().and.returnValue(true);
}

class OnboardingDraftServiceMock {
  read = jasmine.createSpy().and.returnValue(null);
  save = jasmine.createSpy();
  clear = jasmine.createSpy();
}

class RouterMock {
  navigateByUrl = jasmine.createSpy().and.resolveTo(true);
}

class UserContextFacadeServiceMock {
  state$ = of({ profile: null, displayName: 'Tiago Cadastro', avatarUrl: '', userInitials: 'TC' });
  loadProfile = jasmine.createSpy();
  reset = jasmine.createSpy();
}

function createComponent() {
  const profile = new ProfileServiceMock();
  const onboarding = new OnboardingServiceMock();
  const ui = new UiFeedbackServiceMock();
  const auth = new AuthServiceMock();
  const accounts = new AccountsServiceMock();
  const cards = new CardsServiceMock();
  const plans = new PlansServiceMock();
  const categories = new CategoriesServiceMock();
  const lookups = new LookupsServiceMock();
  const uiPermissions = new UiPermissionsServiceMock();
  const onboardingDraft = new OnboardingDraftServiceMock();
  const router = new RouterMock();
  const userContext = new UserContextFacadeServiceMock();

  const component = new OnboardingComponent(
    new FormBuilder(),
    profile as any,
    router as any,
    onboarding as any,
    ui as any,
    auth as any,
    accounts as any,
    cards as any,
    plans as any,
    categories as any,
    lookups as any,
    uiPermissions as any,
    onboardingDraft as any,
    userContext as any
  );

  return { component, profile, onboarding, ui, auth, accounts, cards, plans, categories, lookups, uiPermissions, onboardingDraft, router, userContext };
}

describe('OnboardingComponent smoke', () => {
  it('deve redirecionar para dashboard quando onboarding já estiver concluído', () => {
    const ctx = createComponent();
    ctx.onboarding.getStatus.and.returnValue(of({ step: 2, completed: true }));

    ctx.component.ngOnInit();

    expect(ctx.router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('deve buscar cartões quando o plano permite cartões', () => {
    const ctx = createComponent();

    ctx.component.ngOnInit();

    expect(ctx.uiPermissions.canReadCards).toHaveBeenCalled();
    expect(ctx.cards.list).toHaveBeenCalled();
  });

  it('deve preencher nome com dados da sessão quando perfil ainda não existe', () => {
    const ctx = createComponent();
    ctx.profile.getProfile.and.returnValue(of(null));

    ctx.component.ngOnInit();

    expect(ctx.component.form.get('fullName')?.value).toBe('Tiago Cadastro');
  });

  it('deve atualizar cache de categorias ao abrir modais de lançamentos iniciais', () => {
    const ctx = createComponent();
    ctx.component.accountReady = true;

    ctx.component.openIncomeModal();
    ctx.component.openExpenseModal();

    expect(ctx.categories.invalidateCache).toHaveBeenCalledTimes(2);
    expect(ctx.categories.list).toHaveBeenCalledWith('Income');
    expect(ctx.categories.list).toHaveBeenCalledWith('Expense');
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
    expect(payload.carryOverDay).toBe(1);
    expect(ctx.component.step).toBe(1);
    expect(ctx.onboarding.updateStatus).toHaveBeenCalledWith({ step: 1, completed: false });
  });

  it('deve tratar erro 401 no submit redirecionando para login', () => {
    const ctx = createComponent();
    ctx.component.selectFocus('sair-dividas');
    ctx.component.intelligenceMode = 'B';
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
    expect(ctx.component.step).toBe(3);
    expect(ctx.router.navigateByUrl).not.toHaveBeenCalledWith('/dashboard');
  });

  it('deve concluir onboarding quando conta e lançamentos iniciais estiverem preenchidos', () => {
    const ctx = createComponent();
    ctx.component.step = 2;
    ctx.component.accountReady = true;
    ctx.component.initialIncome = { planId: null, source: 'Salário', amount: 5000, receivedOn: '2026-03-05', categoryId: null, recurring: false };
    ctx.component.initialExpense = { planId: null, name: 'Aluguel', amount: 1500, dueDate: '2026-03-10', categoryId: null, recurring: false, paymentMethodId: null, cardId: null };

    ctx.component.saveInitialEntriesAndFinish();

    expect(ctx.onboarding.updateStatus).toHaveBeenCalledWith({ step: 2, completed: true });
    expect(ctx.router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('deve manter usuario no onboarding quando conclusao falha', () => {
    const ctx = createComponent();
    ctx.component.step = 3;
    ctx.component.accountReady = true;
    ctx.component.initialIncome = { planId: null, source: 'Salário', amount: 5000, receivedOn: '2026-03-05', categoryId: null, recurring: false };
    ctx.component.initialExpense = { planId: null, name: 'Aluguel', amount: 1500, dueDate: '2026-03-10', categoryId: null, recurring: false, paymentMethodId: null, cardId: null };
    ctx.onboarding.updateStatus.and.returnValue(throwError(() => ({ error: { detail: 'Falha ao concluir onboarding E2E.' } })));

    ctx.component.saveInitialEntriesAndFinish();

    expect(ctx.onboarding.updateStatus).toHaveBeenCalledWith({ step: 3, completed: true });
    expect(ctx.ui.error).toHaveBeenCalledWith('Falha ao concluir onboarding E2E.');
    expect(ctx.router.navigateByUrl).not.toHaveBeenCalledWith('/dashboard');
    expect(ctx.component.savingEntries).toBeFalse();
  });
});

describe('OnboardingComponent - correções (auditoria)', () => {
  it('#1 conclui o onboarding apenas com conta ativa (receita/despesa opcionais)', () => {
    const ctx = createComponent();
    ctx.component.step = 3;
    ctx.component.accountReady = true;
    ctx.component.initialIncome = { planId: null, source: '', amount: 0, receivedOn: '', categoryId: null, recurring: false };
    ctx.component.initialExpense = { planId: null, name: '', amount: 0, dueDate: '', categoryId: null, recurring: false, paymentMethodId: null, cardId: null };

    ctx.component.saveInitialEntriesAndFinish();

    expect(ctx.onboarding.updateStatus).toHaveBeenCalledWith({ step: 3, completed: true });
    expect(ctx.router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('#1 ainda bloqueia conclusão sem conta ativa', () => {
    const ctx = createComponent();
    ctx.component.step = 3;
    ctx.component.accountReady = false;

    ctx.component.saveInitialEntriesAndFinish();

    expect(ctx.ui.warning).toHaveBeenCalled();
    expect(ctx.onboarding.updateStatus).not.toHaveBeenCalledWith({ step: 3, completed: true });
  });

  it('#2 aceita telefone fixo (10) e celular (11) dígitos', () => {
    const ctx = createComponent();
    const phone = ctx.component.form.get('phone')!;
    phone.setValue('(81) 3333-4444');
    expect(phone.hasError('phone')).toBeFalse();
    phone.setValue('(81) 93333-4444');
    expect(phone.hasError('phone')).toBeFalse();
    phone.setValue('(81) 333');
    expect(phone.hasError('phone')).toBeTrue();
  });

  it('#3 clampa parcelas (<=36) e duração (<=120) no cadastro do onboarding', () => {
    const ctx = createComponent();
    ctx.component.onExpenseParcelasChange(999);
    expect(ctx.component.modalExpenseParcelas).toBe(36);
    ctx.component.onExpenseFixaMesesChange(999);
    expect(ctx.component.modalExpenseFixaMeses).toBe(120);
    ctx.component.onExpenseParcelasChange(0);
    expect(ctx.component.modalExpenseParcelas).toBe(1);
  });
});

describe('OnboardingComponent - lançamentos iniciais', () => {
  function comReceitaExistente() {
    const ctx = createComponent();
    ctx.component.initialIncome = {
      planId: 'plan-1',
      source: 'Salario',
      amount: 6000,
      receivedOn: '2026-06-01',
      categoryId: 'cat-1',
      recurring: true
    };
    (ctx.component as any).accountReady = true;
    return ctx;
  }

  it('abre o modal preenchido quando a receita já existe', () => {
    const { component } = comReceitaExistente();

    component.openIncomeModal();

    expect(component.modalIncome.fonte).toBe('Salario');
    expect(component.modalIncome.valor).toBe(6000);
    expect(component.modalIncome.categoryId).toBe('cat-1');
    expect(component.modalIncomeDateInput).toBe('01/06/2026');
    expect(component.modalIncomeAmountInput).toContain('6.000,00');
  });

  it('abre o modal em branco quando não há receita', () => {
    const ctx = createComponent();
    (ctx.component as any).accountReady = true;

    ctx.component.openIncomeModal();

    expect(ctx.component.modalIncome.fonte).toBe('');
    expect(ctx.component.modalIncomeAmountInput).toBe('');
  });

  it('salvar com receita existente atualiza em vez de criar outra', () => {
    const { component, plans } = comReceitaExistente();
    component.openIncomeModal();
    component.modalIncome.fonte = 'Salario ajustado';
    component.modalIncome.categoryId = 'cat-1';
    component.modalIncomeAmountInput = '7.000,00';
    component.modalIncomeDateInput = '01/07/2026';

    component.saveIncomeModal();

    expect(plans.update).toHaveBeenCalled();
    expect(plans.update.calls.mostRecent().args[0]).toBe('plan-1');
    expect(plans.create).not.toHaveBeenCalled();
    // O vínculo sobrevive à edição: editar duas vezes seguidas continua editando.
    expect(component.initialIncome.planId).toBe('plan-existente');
  });

  it('sem receita existente, salvar cria e guarda o id devolvido', () => {
    const ctx = createComponent();
    (ctx.component as any).accountReady = true;
    ctx.component.openIncomeModal();
    ctx.component.modalIncome.fonte = 'Consultoria';
    ctx.component.modalIncome.categoryId = 'cat-2';
    ctx.component.modalIncomeAmountInput = '1.500,00';
    ctx.component.modalIncomeDateInput = '10/08/2026';

    ctx.component.saveIncomeModal();

    expect(ctx.plans.create).toHaveBeenCalled();
    expect(ctx.plans.update).not.toHaveBeenCalled();
    // Sem guardar o id, a próxima edição criaria um segundo lançamento.
    expect(ctx.component.initialIncome.planId).toBe('plan-novo');
  });

  it('a despesa segue a mesma regra', () => {
    const ctx = createComponent();
    (ctx.component as any).accountReady = true;
    ctx.component.initialExpense = {
      planId: 'plan-desp',
      name: 'Aluguel',
      amount: 2400,
      dueDate: '2026-08-05',
      categoryId: 'cat-3',
      recurring: false,
      paymentMethodId: null,
      cardId: null
    };

    ctx.component.openExpenseModal();
    expect(ctx.component.modalExpense.nome).toBe('Aluguel');
    expect(ctx.component.modalExpenseDateInput).toBe('05/08/2026');

    ctx.component.modalExpense.categoryId = 'cat-3';
    ctx.component.modalExpenseAmountInput = '2.500,00';
    ctx.component.saveExpenseModal();

    expect(ctx.plans.update.calls.mostRecent().args[0]).toBe('plan-desp');
    expect(ctx.plans.create).not.toHaveBeenCalled();
  });

  it('carrega as formas de pagamento no início — sem isso o select abre vazio', () => {
    const ctx = createComponent();

    ctx.component.ngOnInit();

    expect(ctx.lookups.paymentMethods).toHaveBeenCalled();
    expect(ctx.component.paymentMethods.length).toBe(3);
  });

  it('mantém o onboarding de pé quando o lookup falha', () => {
    const ctx = createComponent();
    ctx.lookups.paymentMethods.and.returnValue(throwError(() => new Error('offline')));

    ctx.component.ngOnInit();

    expect(ctx.component.paymentMethods).toEqual([]);
  });

  it('envia a forma de pagamento escolhida no lançamento da despesa', () => {
    const ctx = createComponent();
    (ctx.component as any).accountReady = true;
    ctx.component.openExpenseModal();
    ctx.component.modalExpense.nome = 'Mercado';
    ctx.component.modalExpense.categoryId = 'cat-3';
    ctx.component.modalExpenseAmountInput = '350,00';
    ctx.component.modalExpenseDateInput = '20/08/2026';
    ctx.component.modalExpenseFormaPagamentoId = 1;

    ctx.component.saveExpenseModal();

    expect(ctx.plans.create.calls.mostRecent().args[0].defaultPaymentMethodId).toBe(1);
  });

  it('editar reabre a despesa com a forma de pagamento, o cartão e a recorrência que estavam salvos', () => {
    const ctx = createComponent();
    ctx.component.ngOnInit();
    (ctx.component as any).accountReady = true;
    ctx.component.initialExpense = {
      planId: 'plan-desp',
      name: 'Streaming',
      amount: 39.9,
      dueDate: '2026-08-10',
      categoryId: 'cat-3',
      recurring: true,
      paymentMethodId: 2,
      cardId: 'card-1'
    };

    ctx.component.openExpenseModal();

    // 2 é "Cartão de crédito": o modo tem de vir junto, senão o campo de cartão
    // nem aparece e o salvar apagaria o vínculo.
    expect(ctx.component.modalExpenseFormaPagamentoId).toBe(2);
    expect(ctx.component.modalExpenseFormaPagamento).toBe('cartao');
    expect(ctx.component.modalExpenseCartaoId).toBe('card-1');
    expect(ctx.component.modalExpenseFixa).toBeTrue();
  });

  it('abre a despesa nova sem forma de pagamento herdada da anterior', () => {
    const ctx = createComponent();
    ctx.component.ngOnInit();
    (ctx.component as any).accountReady = true;
    ctx.component.modalExpenseFormaPagamentoId = 2;

    ctx.component.openExpenseModal();

    expect(ctx.component.modalExpenseFormaPagamentoId).toBeNull();
    expect(ctx.component.modalExpenseFormaPagamento).toBe('avista');
  });

  it('cadastro de cartão acontece sem sair da despesa e volta com o cartão selecionado', () => {
    const ctx = createComponent();
    ctx.component.ngOnInit();
    (ctx.component as any).accountReady = true;
    ctx.component.openExpenseModal();
    ctx.component.modalExpense.nome = 'Mercado';

    ctx.component.openCardModal();

    // o modal da despesa sai de cena, mas o rascunho continua vivo no componente
    expect(ctx.component.showExpenseModal).toBeFalse();
    expect(ctx.component.showCardModal).toBeTrue();
    expect(ctx.component.modalExpense.nome).toBe('Mercado');
    expect(ctx.router.navigateByUrl).not.toHaveBeenCalledWith('/cartoes');

    ctx.component.onCardCreated({
      id: 'card-novo', brandId: 1, holderName: 'FULANO', last4: '4321',
      creditLimit: 5000, statementCloseDay: 10, dueDay: 18
    } as any);

    expect(ctx.component.showCardModal).toBeFalse();
    expect(ctx.component.showExpenseModal).toBeTrue();
    expect(ctx.component.modalExpenseCartaoId).toBe('card-novo');
    expect(ctx.component.modalExpenseCartoes.some((c) => c.id === 'card-novo')).toBeTrue();
    expect(ctx.component.modalExpense.nome).toBe('Mercado');
  });

  it('cancelar o cadastro de cartão devolve a pessoa ao rascunho da despesa', () => {
    const ctx = createComponent();
    ctx.component.ngOnInit();
    (ctx.component as any).accountReady = true;
    ctx.component.openExpenseModal();
    ctx.component.openCardModal();

    ctx.component.closeCardModal();

    expect(ctx.component.showCardModal).toBeFalse();
    expect(ctx.component.showExpenseModal).toBeTrue();
  });

  it('card opcional do passo 4 abre o mesmo modal, sem voltar para a despesa depois', () => {
    const ctx = createComponent();
    ctx.component.ngOnInit();
    (ctx.component as any).accountReady = true;

    ctx.component.openCardsPage();

    expect(ctx.component.showCardModal).toBeTrue();
    expect(ctx.router.navigateByUrl).not.toHaveBeenCalledWith('/cartoes');

    ctx.component.onCardCreated({ id: 'card-opcional', brandId: 1, holderName: 'FULANO', last4: '4321' } as any);

    expect(ctx.component.showCardModal).toBeFalse();
    expect(ctx.component.showExpenseModal).toBeFalse();
    expect(ctx.component.cardsCount).toBe(1);
  });

  it('com cartão já cadastrado, "Gerenciar cartões" continua indo para a tela de cartões', () => {
    const ctx = createComponent();
    ctx.component.ngOnInit();
    ctx.component.cardsCount = 1;

    ctx.component.openCardsPage();

    expect(ctx.router.navigateByUrl).toHaveBeenCalledWith('/cartoes');
    expect(ctx.component.showCardModal).toBeFalse();
  });
});
