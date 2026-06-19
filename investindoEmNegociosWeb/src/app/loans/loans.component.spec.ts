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

    const uiFeedback = { success: jasmine.createSpy(), error: jasmine.createSpy() } as any;
    const cdr = { markForCheck: jasmine.createSpy('markForCheck') } as any;
    const destroyRef = { onDestroy: jasmine.createSpy() } as any;
    return { component: new LoansComponent(loansService, uiFeedback, cdr, destroyRef), loansService, uiFeedback };
  }

  it('deve carregar contratos ao iniciar', () => {
    const ctx = createComponent();

    ctx.component.ngOnInit();

    expect(ctx.loansService.list).toHaveBeenCalled();
    expect(ctx.component.contracts).toEqual([]);
    expect(ctx.component.loading).toBeFalse();
  });

  it('deve simular e preencher o cronograma', () => {
    const ctx = createComponent();

    ctx.component.simulate();

    expect(ctx.loansService.simulate).toHaveBeenCalledWith(ctx.component.form);
    expect(ctx.component.simulation?.monthlyPayment).toBe(550);
    expect(ctx.component.error).toBe('');
  });

  it('deve criar contrato e limpar a simulação anterior', () => {
    const ctx = createComponent();
    ctx.component.simulation = {
      monthlyPayment: 400,
      totalCost: 9600,
      totalInterest: 600,
      amortizationType: 'Price',
      installments: []
    };

    ctx.component.create();

    expect(ctx.loansService.create).toHaveBeenCalledWith(ctx.component.form);
    expect(ctx.component.contracts[0].id).toBe('c1');
    expect(ctx.component.simulation).toBeNull();
    expect(ctx.uiFeedback.success).toHaveBeenCalledWith(jasmine.stringContaining('Empréstimo criado'));
    expect(ctx.component.saving).toBeFalse();
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

    expect(ctx.component.error).toBe('Falha ao criar');
    expect(ctx.component.saving).toBeFalse();
  });
});
