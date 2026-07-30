import { of, throwError } from 'rxjs';
import { LoansComponent } from './loans.component';

describe('LoansComponent', () => {
  function createComponent(overrides?: { loansService?: any }) {
    const loansService = overrides?.loansService ?? {
      list: jasmine.createSpy().and.returnValue(of([])),
      simulate: jasmine.createSpy().and.returnValue(of({
        monthlyPayment: 550,
        totalCost: 13200,
        totalInterest: 1200,
        amortizationType: 'Price',
        installments: [
          {
            id: 'i1',
            installmentNo: 1,
            dueDate: '2026-03-10',
            beginningBalance: 12000,
            principalAmount: 450,
            interestAmount: 100,
            totalAmount: 550,
            endingBalance: 11550,
            status: 'Open',
            paidAt: null
          }
        ]
      })),
      create: jasmine.createSpy().and.returnValue(of({
        id: 'c1',
        title: 'Empréstimo pessoal',
        principalAmount: 12000,
        annualInterestRate: 12,
        termMonths: 24,
        amortizationType: 'Price',
        startDate: '2026-03-10',
        paymentDay: 10,
        monthlyPayment: 550,
        totalCost: 13200,
        totalInterest: 1200,
        status: 'Active',
        openBalance: 13200,
        openInstallments: 24,
        createdAt: '2026-03-14T10:00:00Z',
        installments: []
      })),
      update: jasmine.createSpy(),
      delete: jasmine.createSpy()
    };

    const accountsService = { list: jasmine.createSpy().and.returnValue(of([])) } as any;
    const uiFeedback = { success: jasmine.createSpy(), error: jasmine.createSpy() } as any;
    const cdr = { markForCheck: jasmine.createSpy('markForCheck') } as any;
    const destroyRef = { onDestroy: jasmine.createSpy() } as any;
    return { component: new LoansComponent(loansService, accountsService, uiFeedback, cdr, destroyRef), loansService, uiFeedback };
  }

  it('deve carregar contratos ao iniciar', () => {
    const ctx = createComponent();

    ctx.component.ngOnInit();

    expect(ctx.loansService.list).toHaveBeenCalled();
    expect(ctx.component.contracts()).toEqual([]);
    expect(ctx.component.loading()).toBeFalse();
  });

  it('deve simular e preencher o cronograma', () => {
    const ctx = createComponent();

    ctx.component.simulate();

    expect(ctx.loansService.simulate).toHaveBeenCalledWith(ctx.component.form);
    expect(ctx.component.simulation()?.monthlyPayment).toBe(550);
    expect(ctx.component.error()).toBe('');
  });

  it('deve criar contrato e limpar a simulação anterior', () => {
    const ctx = createComponent();
    ctx.component.simulation.set({
      monthlyPayment: 400,
      totalCost: 9600,
      totalInterest: 600,
      amortizationType: 'Price',
      installments: []
    });

    ctx.component.create();

    expect(ctx.loansService.create).toHaveBeenCalledWith(ctx.component.form);
    expect(ctx.component.contracts()[0].id).toBe('c1');
    expect(ctx.component.simulation()).toBeNull();
    expect(ctx.uiFeedback.success).toHaveBeenCalledWith(jasmine.stringContaining('Empréstimo criado'));
    expect(ctx.component.saving()).toBeFalse();
  });

  it('deve exibir erro quando a criação falhar', () => {
    const loansService = {
      list: jasmine.createSpy().and.returnValue(of([])),
      simulate: jasmine.createSpy().and.returnValue(of(null)),
      create: jasmine.createSpy().and.returnValue(throwError(() => ({ error: { detail: 'Falha ao criar' } }))),
      update: jasmine.createSpy(),
      delete: jasmine.createSpy()
    };
    const ctx = createComponent({ loansService });

    ctx.component.create();

    expect(ctx.component.error()).toBe('Falha ao criar');
    expect(ctx.component.saving()).toBeFalse();
  });

  function contract(partial?: any) {
    return {
      id: 'c1', title: 'Empréstimo', principalAmount: 10000, annualInterestRate: 18,
      termMonths: 24, amortizationType: 'Price', startDate: '2026-01-10', paymentDay: 10,
      monthlyPayment: 500, totalCost: 12000, totalInterest: 2000, status: 'Active',
      openBalance: 8000, openInstallments: 20, createdAt: '2026-01-01', installments: [],
      ...partial
    };
  }

  it('não exclui direto: askRemove apenas prepara a confirmação', () => {
    const ctx = createComponent();
    ctx.component.contracts.set([contract()]);

    ctx.component.askRemove(ctx.component.contracts()[0]);

    expect(ctx.component.pendingDelete?.id).toBe('c1');
    expect(ctx.loansService.delete).not.toHaveBeenCalled();
  });

  it('confirmRemove exclui o contrato pendente e limpa o estado', () => {
    const loansService = {
      list: jasmine.createSpy().and.returnValue(of([])),
      simulate: jasmine.createSpy(),
      create: jasmine.createSpy(),
      update: jasmine.createSpy(),
      delete: jasmine.createSpy().and.returnValue(of(void 0))
    };
    const ctx = createComponent({ loansService });
    ctx.component.contracts.set([contract()]);
    ctx.component.askRemove(ctx.component.contracts()[0]);

    ctx.component.confirmRemove();

    expect(loansService.delete).toHaveBeenCalledWith('c1');
    expect(ctx.component.contracts().length).toBe(0);
    expect(ctx.component.pendingDelete).toBeNull();
    expect(ctx.uiFeedback.success).toHaveBeenCalledWith(jasmine.stringContaining('excluído'));
  });

  it('cancelRemove descarta a confirmação sem excluir', () => {
    const ctx = createComponent();
    ctx.component.contracts.set([contract()]);
    ctx.component.askRemove(ctx.component.contracts()[0]);

    ctx.component.cancelRemove();

    expect(ctx.component.pendingDelete).toBeNull();
    expect(ctx.loansService.delete).not.toHaveBeenCalled();
  });

  it('filteredViews respeita o filtro de situação', () => {
    const ctx = createComponent();
    ctx.component.contracts.set([
      contract({ id: 'a', status: 'Active', installments: [{ id: 'i1', installmentNo: 1, dueDate: '2026-03-10', beginningBalance: 0, principalAmount: 0, interestAmount: 0, totalAmount: 500, endingBalance: 0, status: 'Open' }] }),
      contract({ id: 'b', status: 'Closed', installments: [{ id: 'i2', installmentNo: 1, dueDate: '2026-02-10', beginningBalance: 0, principalAmount: 0, interestAmount: 0, totalAmount: 500, endingBalance: 0, status: 'Paid' }] })
    ]);

    ctx.component.setStatusFilter('closed');

    expect(ctx.component.filteredViews.map((v) => v.contract.id)).toEqual(['b']);
  });

  it('openPaySheet + confirmPay registram o pagamento e aplicam o resultado do backend', () => {
    const paymentResult = {
      paymentId: 'p1', contractId: 'c1', installmentId: 'i1', amount: 550,
      principalAmount: 450, interestAmount: 100, penaltyAmount: 0, discountAmount: 0,
      paidAt: '2026-03-10', accountTransactionId: null, receiptUrl: null,
      installment: { id: 'i1', installmentNo: 1, dueDate: '2026-03-10', beginningBalance: 12000, principalAmount: 450, interestAmount: 100, totalAmount: 550, endingBalance: 11550, status: 'Paid', paidAt: '2026-03-10' },
      contract: { id: 'c1', status: 'Active', openBalance: 12650, paidAmount: 550, paidPrincipal: 450, paidInterest: 100, openInstallments: 23, nextDueDate: '2026-04-10', monthlyPayment: 550 }
    };
    const loansService = {
      list: jasmine.createSpy().and.returnValue(of([])),
      payInstallmentV2: jasmine.createSpy().and.returnValue(of(paymentResult))
    };
    const ctx = createComponent({ loansService });
    const c = contract({ id: 'c1', status: 'Active', openBalance: 13200, openInstallments: 24, installments: [
      { id: 'i1', installmentNo: 1, dueDate: '2026-03-10', beginningBalance: 12000, principalAmount: 450, interestAmount: 100, totalAmount: 550, endingBalance: 11550, status: 'Open' }
    ] });
    ctx.component.contracts.set([c]);

    ctx.component.openPaySheet(c, c.installments[0]);
    expect(ctx.component.paySheet).toBeTruthy();
    ctx.component.confirmPay();

    expect(loansService.payInstallmentV2).toHaveBeenCalled();
    expect(ctx.component.paySheet).toBeNull();
    expect(ctx.component.contracts()[0].openBalance).toBe(12650);
    expect(ctx.component.contracts()[0].installments[0].status).toBe('Paid');
  });

  it('compare carrega a comparação e chooseSystem escolhe o sistema', () => {
    const comparison = {
      price: { monthlyPayment: 550, totalCost: 13200, totalInterest: 1200, amortizationType: 'Price', installments: [{ id: 'p1', installmentNo: 1, dueDate: '2026-03-10', beginningBalance: 12000, principalAmount: 450, interestAmount: 100, totalAmount: 550, endingBalance: 11550, status: 'Open' }] },
      sac: { monthlyPayment: 600, totalCost: 13000, totalInterest: 1000, amortizationType: 'Sac', installments: [{ id: 's1', installmentNo: 1, dueDate: '2026-03-10', beginningBalance: 12000, principalAmount: 500, interestAmount: 100, totalAmount: 600, endingBalance: 11500, status: 'Open' }] }
    };
    const loansService = {
      list: jasmine.createSpy().and.returnValue(of([])),
      compare: jasmine.createSpy().and.returnValue(of(comparison))
    };
    const ctx = createComponent({ loansService });

    ctx.component.compare();
    expect(loansService.compare).toHaveBeenCalled();
    expect(ctx.component.comparison()).toBeTruthy();

    ctx.component.chooseSystem('Sac');
    expect(ctx.component.form.amortizationType).toBe('Sac');
    expect(ctx.component.simulation()?.amortizationType).toBe('Sac');
    expect(ctx.component.comparison()).toBeNull();
  });

  it('confirmArchive arquiva o contrato e atualiza a lista (sem excluir)', () => {
    const archived = contract({ id: 'c1', status: 'Archived', installments: [] });
    const loansService = {
      list: jasmine.createSpy().and.returnValue(of([])),
      archive: jasmine.createSpy().and.returnValue(of(archived)),
      delete: jasmine.createSpy()
    };
    const ctx = createComponent({ loansService });
    ctx.component.contracts.set([contract({ id: 'c1', status: 'Active' })]);

    ctx.component.askArchive(contract({ id: 'c1' }));
    ctx.component.confirmArchive();

    expect(loansService.archive).toHaveBeenCalledWith('c1');
    expect(loansService.delete).not.toHaveBeenCalled();
    expect(ctx.component.contracts()[0].status).toBe('Archived');
  });
});
