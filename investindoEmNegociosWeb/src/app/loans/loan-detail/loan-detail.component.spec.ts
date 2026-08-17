import { of } from 'rxjs';
import { LoanDetailComponent } from './loan-detail.component';

describe('LoanDetailComponent', () => {
  function build(overrides?: { loansService?: any }) {
    const contract = {
      id: 'c1', title: 'Empréstimo', principalAmount: 12000, annualInterestRate: 12,
      termMonths: 24, amortizationType: 'Price', startDate: '2026-01-10', paymentDay: 10,
      monthlyPayment: 550, totalCost: 13200, totalInterest: 1200, status: 'Active',
      openBalance: 12650, openInstallments: 23, createdAt: '2026-01-01',
      installments: [
        { id: 'i1', installmentNo: 1, dueDate: '2026-02-10', beginningBalance: 12000, principalAmount: 450, interestAmount: 100, totalAmount: 550, endingBalance: 11550, status: 'Paid', paidAt: '2026-02-10' },
        { id: 'i2', installmentNo: 2, dueDate: '2026-03-10', beginningBalance: 11550, principalAmount: 455, interestAmount: 95, totalAmount: 550, endingBalance: 11095, status: 'Open', paidAt: null }
      ]
    };
    const loansService = overrides?.loansService ?? {
      get: jasmine.createSpy().and.returnValue(of(contract)),
      timeline: jasmine.createSpy().and.returnValue(of([
        { at: '2026-02-10T00:00:00Z', type: 'installment_paid', title: 'Parcela paga', amount: 550 },
        { at: '2026-01-01T00:00:00Z', type: 'contract_created', title: 'Contrato criado', amount: 12000 }
      ])),
      listPayments: jasmine.createSpy().and.returnValue(of([
        { id: 'p1', paidAt: '2026-02-10', amount: 550, principalAmount: 450, interestAmount: 100, penaltyAmount: 0, discountAmount: 0, accountId: null, note: null, receiptUrl: null, isReversed: false, reversedAt: null }
      ])),
      reversePayment: jasmine.createSpy().and.returnValue(of({
        paymentId: 'p1', contractId: 'c1', installmentId: 'i1', amount: 550, principalAmount: 450, interestAmount: 100,
        penaltyAmount: 0, discountAmount: 0, paidAt: '2026-02-10', accountTransactionId: null, receiptUrl: null,
        installment: { ...contract.installments[0], status: 'Open', paidAt: null },
        contract: { id: 'c1', status: 'Active', openBalance: 13200, paidAmount: 0, paidPrincipal: 0, paidInterest: 0, openInstallments: 24, nextDueDate: '2026-02-10', monthlyPayment: 550 }
      })),
      payInstallmentV2: jasmine.createSpy(),
      simulateAmortization: jasmine.createSpy().and.returnValue(of({
        strategy: 'ReduceTerm', amount: 2000, previousBalance: 8000, newBalance: 6000,
        previousTerm: 12, newTerm: 9, previousPayment: 550, newPayment: 550,
        estimatedInterestBefore: 600, estimatedInterestAfter: 400, estimatedSavings: 200,
        disclaimer: 'Este é um cálculo estimado.'
      })),
      confirmAmortization: jasmine.createSpy().and.returnValue(of({
        amortizationId: 'a1', contractId: 'c1',
        simulation: { strategy: 'ReduceTerm', amount: 2000, previousBalance: 8000, newBalance: 6000, previousTerm: 12, newTerm: 9, previousPayment: 550, newPayment: 550, estimatedInterestBefore: 600, estimatedInterestAfter: 400, estimatedSavings: 200, disclaimer: '...' },
        accountTransactionId: null,
        contract: { id: 'c1', status: 'Active', openBalance: 6000, paidAmount: 0, paidPrincipal: 0, paidInterest: 0, openInstallments: 9, nextDueDate: '2026-03-10', monthlyPayment: 550 },
        installments: []
      }))
    };
    const accountsService = { list: jasmine.createSpy().and.returnValue(of([])) } as any;
    const route = { snapshot: { paramMap: { get: () => 'c1' } } } as any;
    const uiFeedback = { success: jasmine.createSpy(), error: jasmine.createSpy() } as any;
    const cdr = { markForCheck: jasmine.createSpy() } as any;
    const destroyRef = { onDestroy: jasmine.createSpy() } as any;
    const component = new LoanDetailComponent(route, loansService, accountsService, uiFeedback, cdr, destroyRef);
    return { component, loansService, uiFeedback };
  }

  it('carrega o contrato pelo id da rota', () => {
    const ctx = build();
    ctx.component.ngOnInit();
    expect(ctx.loansService.get).toHaveBeenCalledWith('c1');
    expect(ctx.component.contract()?.id).toBe('c1');
    expect(ctx.component.view?.paidCount).toBe(1);
    expect(ctx.component.expectedPayoffDate).toBe('2026-03-10');
  });

  it('togglePayments carrega o histórico da parcela paga', () => {
    const ctx = build();
    ctx.component.ngOnInit();
    const paid = ctx.component.contract()!.installments[0];
    ctx.component.togglePayments(paid);
    expect(ctx.loansService.listPayments).toHaveBeenCalledWith('c1', 'i1');
    expect(ctx.component.paymentsByInstallment['i1'].length).toBe(1);
  });

  it('reversePayment estorna e aplica o resultado do backend', () => {
    const ctx = build();
    ctx.component.ngOnInit();
    const paid = ctx.component.contract()!.installments[0];
    ctx.component.reversePayment(paid, { id: 'p1', paidAt: '2026-02-10', amount: 550, principalAmount: 450, interestAmount: 100, penaltyAmount: 0, discountAmount: 0, isReversed: false } as any);
    expect(ctx.loansService.reversePayment).toHaveBeenCalledWith('c1', 'i1', 'p1');
    expect(ctx.component.contract()!.installments[0].status).toBe('Open');
    expect(ctx.component.contract()!.openInstallments).toBe(24);
  });

  it('aba Histórico carrega a timeline sob demanda e o gráfico de saldo é derivado das parcelas', () => {
    const ctx = build();
    ctx.component.ngOnInit();

    // Gráfico derivado das parcelas (sem backend).
    expect(ctx.component.balanceChart).not.toBeNull();

    // Timeline carrega só ao abrir a aba.
    expect(ctx.loansService.timeline).not.toHaveBeenCalled();
    ctx.component.setTab('historico');
    expect(ctx.loansService.timeline).toHaveBeenCalledWith('c1');
    expect(ctx.component.timeline()?.length).toBe(2);
  });

  it('amortização: simula, mostra o preview e confirma recarregando o contrato', () => {
    const ctx = build();
    ctx.component.ngOnInit();
    ctx.component.openAmortSheet();
    ctx.component.amortForm.amount = 2000;

    ctx.component.simulateAmort();
    expect(ctx.loansService.simulateAmortization).toHaveBeenCalled();
    expect(ctx.component.amortPreview()?.estimatedSavings).toBe(200);

    ctx.component.confirmAmort();
    expect(ctx.loansService.confirmAmortization).toHaveBeenCalled();
    expect(ctx.component.amortSheetOpen).toBe(false);
    expect(ctx.loansService.get).toHaveBeenCalledTimes(2); // init + reload após confirmar
  });
});
