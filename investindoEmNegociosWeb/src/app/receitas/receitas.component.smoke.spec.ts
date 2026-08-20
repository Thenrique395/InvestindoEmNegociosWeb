import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { ReceitasComponent } from './receitas.component';
import { StoredIncome } from '../data/api-data.service';
import { setLocaleSettings } from '../utils/locale-settings';

class ApiDataServiceMock {
  private readonly incomesSubject = new BehaviorSubject<StoredIncome[]>([]);
  private readonly summarySubject = new BehaviorSubject<any>(null);
  private readonly incomesLoadingSubject = new BehaviorSubject<boolean>(false);

  readonly incomes$ = this.incomesSubject.asObservable();
  readonly incomeSummary$ = this.summarySubject.asObservable();
  readonly incomesLoading$ = this.incomesLoadingSubject.asObservable();

  refreshIncomes = jasmine.createSpy('refreshIncomes');
  updateIncome = jasmine.createSpy('updateIncome').and.returnValue(of(undefined));
  updateIncomeInstallment = jasmine.createSpy('updateIncomeInstallment').and.returnValue(of(undefined));
  addIncome = jasmine.createSpy('addIncome').and.returnValue(of(undefined));
  removeIncomeInstallment = jasmine.createSpy('removeIncomeInstallment').and.returnValue(of(undefined));
  removeIncome = jasmine.createSpy('removeIncome').and.returnValue(of(undefined));
  setIncomeStatusLocal = jasmine.createSpy('setIncomeStatusLocal');
  markIncomeReceived = jasmine.createSpy('markIncomeReceived').and.returnValue(of(true));

  emitIncomes(items: StoredIncome[]): void {
    this.incomesSubject.next(items);
  }

  emitSummary(summary: any): void {
    this.summarySubject.next(summary);
  }
}

class AuthServiceMock {
  role: 'Basic' | 'Intermediate' | 'Advanced' | 'Admin' = 'Basic';
  getRole = jasmine.createSpy('getRole').and.callFake(() => this.role);
}

class CategoriesServiceMock {
  list = jasmine.createSpy('list').and.returnValue(of([]));
}

class UiFeedbackServiceMock {
  success = jasmine.createSpy('success');
  warning = jasmine.createSpy('warning');
  error = jasmine.createSpy('error');
  info = jasmine.createSpy('info');
}

class AccountsServiceMock {
  list = jasmine.createSpy('list').and.returnValue(of([]));
  resolveDefaultAccountId = jasmine.createSpy('resolveDefaultAccountId').and.returnValue(null);
  setDefaultAccountId = jasmine.createSpy('setDefaultAccountId');
}

class ActivatedRouteMock {
  private readonly queryParamMapSubject = new BehaviorSubject(convertToParamMap({}));
  readonly queryParamMap = this.queryParamMapSubject.asObservable();

  setQuery(params: Record<string, string>): void {
    this.queryParamMapSubject.next(convertToParamMap(params));
  }
}

function createComponent() {
  const db = new ApiDataServiceMock();
  const auth = new AuthServiceMock();
  const categories = new CategoriesServiceMock();
  const ui = new UiFeedbackServiceMock();
  const accounts = new AccountsServiceMock();
  const route = new ActivatedRouteMock();

  const component = new ReceitasComponent(
    db as any,
    auth as any,
    categories as any,
    ui as any,
    accounts as any,
    { listPayments: () => of([]), uploadReceipt: () => of({ receiptUrl: '' }) } as any,
    route as any,
    { replaceState: jasmine.createSpy('replaceState') } as any,
    { navigateByUrl: jasmine.createSpy('navigateByUrl') } as any,
    { markForCheck: jasmine.createSpy('markForCheck') } as any,
    { onDestroy: () => {} } as any,
    { history: jasmine.createSpy('history').and.returnValue(of({ planId: 'p1', schedule: 'OneTime', installments: [], events: [] })) } as any
  );

  return { component, db, auth, categories, ui, accounts, route };
}

describe('ReceitasComponent smoke', () => {
  beforeEach(() => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });
  });

  it('deve iniciar com foco pendente quando query param focus=pending', () => {
    const ctx = createComponent();
    ctx.route.setQuery({ focus: 'pending' });

    ctx.component.ngOnInit();

    expect(ctx.component.focusMode).toBe('pending');
    expect(ctx.component.filtroStatus).toBe('OPEN');
    expect(ctx.db.refreshIncomes).toHaveBeenCalled();
  });

  it('deve filtrar lista por mês atual e status', () => {
    const ctx = createComponent();
    ctx.component.ngOnInit();
    ctx.component.dataAtual = new Date(2026, 2, 1); // março/2026
    // Em aberto com recebimento já vencido é exibido (e filtrado) como atrasado.
    ctx.component.filtroStatus = 'OVERDUE';

    ctx.db.emitIncomes([
      { id: 'i1', fonte: 'Salário', valor: 5000, recebimento: '05/03/2026', status: 'OPEN', fixa: true } as StoredIncome,
      { id: 'i2', fonte: 'Bônus', valor: 800, recebimento: '10/03/2026', status: 'PAID', fixa: false } as StoredIncome,
      { id: 'i3', fonte: 'Freela', valor: 600, recebimento: '07/04/2026', status: 'OPEN', fixa: false } as StoredIncome
    ]);

    const rendas = ctx.component.rendas;
    expect(rendas.length).toBe(1);
    expect(rendas[0].id).toBe('i1');
  });

  it('deve navegar meses e recarregar receitas do mês selecionado', () => {
    const ctx = createComponent();
    ctx.component.dataAtual = new Date(2026, 2, 1); // março

    ctx.component.mesAnterior();
    expect(ctx.component.dataAtual.getMonth()).toBe(1); // fevereiro
    expect(ctx.db.refreshIncomes).toHaveBeenCalledWith('2026-02');

    ctx.component.proximoMes();
    expect(ctx.component.dataAtual.getMonth()).toBe(2); // março
    expect(ctx.db.refreshIncomes).toHaveBeenCalledWith('2026-03');
  });

  it('deve bloquear baixa em lote sem conta para perfil Intermediate', () => {
    const ctx = createComponent();
    ctx.auth.role = 'Intermediate';
    ctx.component.ngOnInit();
    ctx.component.dataAtual = new Date(2026, 2, 1);
    ctx.component.filtroStatus = 'ALL';
    ctx.component.contaBaixaId = null;
    ctx.component.selectedIds = new Set(['i1']);
    ctx.db.emitIncomes([
      { id: 'i1', fonte: 'Salário', valor: 2000, recebimento: '05/03/2026', status: 'OPEN', fixa: true } as StoredIncome
    ]);

    ctx.component.marcarRecebidasSelecionadas();

    expect(ctx.ui.error).toHaveBeenCalled();
    expect(ctx.db.markIncomeReceived).not.toHaveBeenCalled();
  });

  it('deve marcar selecionadas como recebidas e limpar seleção', () => {
    const ctx = createComponent();
    ctx.auth.role = 'Basic';
    ctx.component.ngOnInit();
    ctx.component.dataAtual = new Date(2026, 2, 1);
    ctx.component.selectedIds = new Set(['i1', 'i2']);
    ctx.db.emitIncomes([
      { id: 'i1', fonte: 'Salário', valor: 2000, recebimento: '05/03/2026', status: 'OPEN', fixa: true } as StoredIncome,
      { id: 'i2', fonte: 'Freela', valor: 500, recebimento: '10/03/2026', status: 'OPEN', fixa: false } as StoredIncome
    ]);

    ctx.component.marcarRecebidasSelecionadas();

    expect(ctx.db.markIncomeReceived).toHaveBeenCalledTimes(2);
    expect(ctx.component.selectedIds.size).toBe(0);
    expect(ctx.ui.success).toHaveBeenCalled();
  });

  it('deve priorizar total vindo do summary quando disponível', () => {
    const ctx = createComponent();
    ctx.component.ngOnInit();
    ctx.component.dataAtual = new Date(2026, 2, 1);
    ctx.db.emitSummary({
      month: '2026-03',
      total: 7200,
      totalRecurring: 6000,
      totalOneTime: 1200
    });
    ctx.db.emitIncomes([
      { id: 'i1', fonte: 'Salário', valor: 5000, recebimento: '05/03/2026', status: 'OPEN', fixa: true } as StoredIncome
    ]);

    expect(ctx.component.totalRendas).toBe(7200);
    expect(ctx.component.totalRecorrentes).toBe(6000);
    expect(ctx.component.totalAvulsas).toBe(1200);
  });
});

class InstallmentsServiceMock {
  listPayments = jasmine.createSpy('listPayments').and.returnValue(of([]));
  uploadReceipt = jasmine.createSpy('uploadReceipt').and.returnValue(of({ receiptUrl: 'http://x/receipt.pdf' }));
}

function buildPayment(overrides: Partial<{ id: string; paidAmount: number; paidAt: string }> = {}) {
  return { id: 'pay-1', paidAmount: 100, paidAt: '2026-06-10T00:00:00Z', ...overrides };
}

function createComponentForReceiptTests() {
  const db = new ApiDataServiceMock();
  const auth = new AuthServiceMock();
  const categories = new CategoriesServiceMock();
  const ui = new UiFeedbackServiceMock();
  const accounts = new AccountsServiceMock();
  const installments = new InstallmentsServiceMock();
  const route = new ActivatedRouteMock();

  const component = new ReceitasComponent(
    db as any,
    auth as any,
    categories as any,
    ui as any,
    accounts as any,
    installments as any,
    route as any,
    { replaceState: jasmine.createSpy('replaceState') } as any,
    { navigateByUrl: jasmine.createSpy('navigateByUrl') } as any,
    { markForCheck: jasmine.createSpy('markForCheck') } as any,
    { onDestroy: () => {} } as any,
    { history: jasmine.createSpy('history').and.returnValue(of({ planId: 'p1', schedule: 'OneTime', installments: [], events: [] })) } as any
  );

  return { component, installments, ui };
}

describe('ReceitasComponent - anexo de comprovante', () => {
  it('não prepara o anexo quando já há upload em andamento para a mesma parcela', () => {
    const { component, installments } = createComponentForReceiptTests();
    component.attachingReceiptIds.set(new Set(['inst-1']));

    component.prepararAnexoComprovante('inst-1');

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.pdf')] });
    component.onComprovanteFileSelected({ target: input } as unknown as Event);

    expect(installments.listPayments).not.toHaveBeenCalled();
  });

  it('envia o comprovante do recebimento mais recente ao selecionar um arquivo', () => {
    const { component, installments, ui } = createComponentForReceiptTests();
    installments.listPayments.and.returnValue(of([
      buildPayment({ id: 'pay-1', paidAmount: 100, paidAt: '2026-06-01T00:00:00Z' }),
      buildPayment({ id: 'pay-2', paidAmount: 50, paidAt: '2026-06-10T00:00:00Z' })
    ]));
    component.prepararAnexoComprovante('inst-1');
    const file = new File(['conteudo'], 'comprovante.pdf');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onComprovanteFileSelected({ target: input } as unknown as Event);

    expect(installments.uploadReceipt).toHaveBeenCalledWith('inst-1', 'pay-2', file);
    expect(ui.success).toHaveBeenCalled();
  });

  it('avisa quando não há recebimento elegível para anexar comprovante', () => {
    const { component, installments, ui } = createComponentForReceiptTests();
    installments.listPayments.and.returnValue(of([buildPayment({ paidAmount: 0 })]));
    component.prepararAnexoComprovante('inst-1');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.pdf')] });

    component.onComprovanteFileSelected({ target: input } as unknown as Event);

    expect(installments.uploadReceipt).not.toHaveBeenCalled();
    expect(ui.info).toHaveBeenCalled();
  });

  it('mostra erro quando o upload do comprovante falha', () => {
    const { component, installments, ui } = createComponentForReceiptTests();
    installments.listPayments.and.returnValue(of([buildPayment()]));
    installments.uploadReceipt.and.returnValue(throwError(() => new Error('falhou')));
    component.prepararAnexoComprovante('inst-1');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.pdf')] });

    component.onComprovanteFileSelected({ target: input } as unknown as Event);

    expect(ui.error).toHaveBeenCalled();
  });

  it('mostra erro quando falha ao consultar os recebimentos da parcela', () => {
    const { component, installments, ui } = createComponentForReceiptTests();
    installments.listPayments.and.returnValue(throwError(() => new Error('falhou')));
    component.prepararAnexoComprovante('inst-1');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.pdf')] });

    component.onComprovanteFileSelected({ target: input } as unknown as Event);

    expect(ui.error).toHaveBeenCalled();
  });
});

describe('ReceitasComponent - edição por escopo (parcela x recorrência)', () => {
  const receitaRecorrente: StoredIncome = {
    id: 'inst-ago',
    planId: 'plan-1',
    fonte: 'Salário',
    categoria: 'Trabalho',
    categoryId: 'cat-1',
    valor: 1000,
    recebimento: '05/08/2026',
    schedule: 'Recurring',
    fixa: true,
    status: 'OPEN'
  };

  function editar(income: StoredIncome) {
    const ctx = createComponent();
    ctx.component.editar(income);
    ctx.component.valorInput = '1.500,00';
    return ctx;
  }

  it('ao salvar uma receita recorrente, abre o modal de escopo em vez de persistir direto', () => {
    const ctx = editar(receitaRecorrente);
    ctx.component.salvar();

    expect(ctx.component.confirmEdicao).not.toBeNull();
    // fecha o modal do form para a confirm-sheet de escopo ficar visível por cima
    expect(ctx.component.mostrarForm).toBe(false);
    expect(ctx.db.updateIncome).not.toHaveBeenCalled();
    expect(ctx.db.updateIncomeInstallment).not.toHaveBeenCalled();
  });

  it('cancelar o modal de escopo reabre o formulário sem perder a edição', () => {
    const ctx = editar(receitaRecorrente);
    ctx.component.salvar();
    expect(ctx.component.mostrarForm).toBe(false);

    ctx.component.cancelarEdicaoReceita();

    expect(ctx.component.confirmEdicao).toBeNull();
    expect(ctx.component.mostrarForm).toBe(true);
    expect(ctx.db.updateIncome).not.toHaveBeenCalled();
    expect(ctx.db.updateIncomeInstallment).not.toHaveBeenCalled();
  });

  it('escopo "somente este mês" edita apenas a parcela (updateIncomeInstallment)', () => {
    const ctx = editar(receitaRecorrente);
    ctx.component.salvar();
    ctx.component.confirmarEdicaoReceita('single');

    expect(ctx.db.updateIncomeInstallment).toHaveBeenCalled();
    const [installmentId, payload] = ctx.db.updateIncomeInstallment.calls.mostRecent().args;
    expect(installmentId).toBe('inst-ago');
    expect(payload.valor).toBe(1500);
    expect(ctx.db.updateIncome).not.toHaveBeenCalled();
    expect(ctx.component.confirmEdicao).toBeNull();
  });

  it('escopo "toda a recorrência" edita o plano inteiro (updateIncome)', () => {
    const ctx = editar(receitaRecorrente);
    ctx.component.salvar();
    ctx.component.confirmarEdicaoReceita('all');

    expect(ctx.db.updateIncome).toHaveBeenCalled();
    const [planId, payload] = ctx.db.updateIncome.calls.mostRecent().args;
    expect(planId).toBe('plan-1');
    expect(payload.valor).toBe(1500);
    expect(ctx.db.updateIncomeInstallment).not.toHaveBeenCalled();
  });

  it('salvar sem valor mostra erro e não persiste (#2 — sem retorno silencioso)', () => {
    const ctx = createComponent();
    ctx.component.novaRenda = { id: '', planId: '', fonte: 'Salário', categoria: '', categoryId: 'cat-1', valor: 0, recebimento: '', fixa: false, fixaInicio: '' };
    ctx.component.valorInput = '';
    ctx.component.recebimentoInput = '05/08/2026';

    ctx.component.salvar();

    expect(ctx.ui.error).toHaveBeenCalled();
    expect(ctx.db.addIncome).not.toHaveBeenCalled();
    expect(ctx.db.updateIncome).not.toHaveBeenCalled();
  });

  it('receita avulsa (não recorrente) salva direto, sem modal de escopo', () => {
    const avulsa: StoredIncome = { ...receitaRecorrente, id: 'inst-x', schedule: 'OneTime', fixa: false };
    const ctx = editar(avulsa);
    ctx.component.salvar();

    expect(ctx.component.confirmEdicao).toBeNull();
    expect(ctx.db.updateIncome).toHaveBeenCalled();
    expect(ctx.db.updateIncomeInstallment).not.toHaveBeenCalled();
  });
});

describe('ReceitasComponent - cobertura de cadastro/exclusão/estado', () => {
  const novaBase = (over: Partial<StoredIncome> = {}): StoredIncome => ({
    id: '', planId: '', fonte: 'Salário', categoria: '', categoryId: 'cat-1', valor: 0, recebimento: '', fixa: false, fixaInicio: '', ...over
  });

  it('salvar nova receita avulsa chama addIncome (cadastro sucesso)', () => {
    const ctx = createComponent();
    ctx.component.novaRenda = novaBase();
    spyOn(ctx.component as any, 'parseValor').and.returnValue(3000);
    ctx.component.valorInput = '3000';
    ctx.component.recebimentoInput = '05/08/2026';
    ctx.component.salvar();
    expect(ctx.db.addIncome).toHaveBeenCalled();
  });

  it('salvar sem fonte mostra erro e não persiste (#2)', () => {
    const ctx = createComponent();
    ctx.component.novaRenda = novaBase({ fonte: '' });
    spyOn(ctx.component as any, 'parseValor').and.returnValue(1000);
    ctx.component.valorInput = '1000';
    ctx.component.recebimentoInput = '05/08/2026';
    ctx.component.salvar();
    expect(ctx.ui.error).toHaveBeenCalled();
    expect(ctx.db.addIncome).not.toHaveBeenCalled();
  });

  it('excluir "somente este mês" chama removeIncomeInstallment', () => {
    const ctx = createComponent();
    (ctx.component as any).deleteInstallmentId = 'inst-1';
    ctx.component.confirmarExclusao('single');
    expect(ctx.db.removeIncomeInstallment).toHaveBeenCalledWith('inst-1');
  });

  it('excluir "encerrar recorrência" chama removeIncome', () => {
    const ctx = createComponent();
    (ctx.component as any).deletePlanId = 'plan-1';
    ctx.component.confirmarExclusao('all');
    expect(ctx.db.removeIncome).toHaveBeenCalledWith('plan-1');
  });

  it('editar receita já recebida (PAID) abre modal de reversão, não o form', () => {
    const ctx = createComponent();
    ctx.component.rendasAll.set([novaBase({ id: 'inst-1', planId: 'plan-1', valor: 1000, recebimento: '05/08/2026', status: 'PAID' })]);
    ctx.component.editarPorId('inst-1');
    expect(ctx.component.showEditReceivedModal).toBeTrue();
    expect(ctx.component.mostrarForm).toBeFalse();
  });
});
