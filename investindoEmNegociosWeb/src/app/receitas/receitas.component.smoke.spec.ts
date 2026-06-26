import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
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
  updateIncome = jasmine.createSpy('updateIncome');
  addIncome = jasmine.createSpy('addIncome');
  removeIncomeInstallment = jasmine.createSpy('removeIncomeInstallment');
  removeIncome = jasmine.createSpy('removeIncome');
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
    { markForCheck: jasmine.createSpy('markForCheck') } as any,
    { onDestroy: () => {} } as any
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
    expect(ctx.component.filtroStatus).toBe('pending');
    expect(ctx.db.refreshIncomes).toHaveBeenCalled();
  });

  it('deve filtrar lista por mês atual e status', () => {
    const ctx = createComponent();
    ctx.component.ngOnInit();
    ctx.component.dataAtual = new Date(2026, 2, 1); // março/2026
    ctx.component.filtroStatus = 'pending';

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
    ctx.component.filtroStatus = 'all';
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
