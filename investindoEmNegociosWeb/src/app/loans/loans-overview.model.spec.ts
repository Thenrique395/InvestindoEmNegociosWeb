import { LoanContractResponse, LoanInstallmentResponse } from '../loans.service';
import { buildContractView, buildContractViews, buildLoansOverview } from './loans-overview.model';

function installment(p: Partial<LoanInstallmentResponse> & { installmentNo: number }): LoanInstallmentResponse {
  return {
    id: `i-${p.installmentNo}`,
    installmentNo: p.installmentNo,
    dueDate: p.dueDate ?? '2026-08-10',
    beginningBalance: p.beginningBalance ?? 0,
    principalAmount: p.principalAmount ?? 0,
    interestAmount: p.interestAmount ?? 0,
    totalAmount: p.totalAmount ?? 500,
    endingBalance: p.endingBalance ?? 0,
    status: p.status ?? 'Open',
    paidAt: p.paidAt
  };
}

function contract(p: Partial<LoanContractResponse> & { id: string }): LoanContractResponse {
  return {
    id: p.id,
    title: p.title ?? 'Empréstimo',
    principalAmount: p.principalAmount ?? 10000,
    annualInterestRate: p.annualInterestRate ?? 18,
    termMonths: p.termMonths ?? 24,
    amortizationType: p.amortizationType ?? 'Price',
    startDate: p.startDate ?? '2026-01-10',
    paymentDay: p.paymentDay ?? 10,
    monthlyPayment: p.monthlyPayment ?? 500,
    totalCost: p.totalCost ?? 12000,
    totalInterest: p.totalInterest ?? 2000,
    status: p.status ?? 'Active',
    openBalance: p.openBalance ?? 8000,
    openInstallments: p.openInstallments ?? 20,
    createdAt: p.createdAt ?? '2026-01-01',
    installments: p.installments ?? []
  };
}

describe('loans-overview.model', () => {
  it('deriva parcelas pagas, % pago e próxima parcela do contrato', () => {
    const view = buildContractView(
      contract({
        id: 'c1',
        installments: [
          installment({ installmentNo: 1, status: 'Paid', dueDate: '2026-02-10' }),
          installment({ installmentNo: 2, status: 'Paid', dueDate: '2026-03-10' }),
          installment({ installmentNo: 3, status: 'Open', dueDate: '2026-04-10', totalAmount: 550 }),
          installment({ installmentNo: 4, status: 'Open', dueDate: '2026-05-10' })
        ]
      })
    );

    expect(view.paidCount).toBe(2);
    expect(view.totalCount).toBe(4);
    expect(view.paidPercent).toBe(50);
    expect(view.nextInstallment?.installmentNo).toBe(3);
    expect(view.statusLabel).toBe('Ativo');
    expect(view.statusTone).toBe('info');
  });

  it('marca como quitado quando todas as parcelas estão pagas', () => {
    const view = buildContractView(
      contract({
        id: 'c2',
        status: 'Active',
        installments: [
          installment({ installmentNo: 1, status: 'Paid' }),
          installment({ installmentNo: 2, status: 'Paid' })
        ]
      })
    );

    expect(view.statusLabel).toBe('Quitado');
    expect(view.statusTone).toBe('success');
    expect(view.nextInstallment).toBeNull();
    expect(view.paidPercent).toBe(100);
  });

  it('consolida saldo, mensal, próximo vencimento e quitação prevista', () => {
    const overview = buildLoansOverview([
      contract({
        id: 'c1',
        openBalance: 8000,
        monthlyPayment: 500,
        openInstallments: 2,
        installments: [
          installment({ installmentNo: 1, status: 'Paid', dueDate: '2026-02-10' }),
          installment({ installmentNo: 2, status: 'Open', dueDate: '2026-05-10', totalAmount: 500 }),
          installment({ installmentNo: 3, status: 'Open', dueDate: '2026-06-10' })
        ]
      }),
      contract({
        id: 'c2',
        openBalance: 3000,
        monthlyPayment: 300,
        openInstallments: 1,
        installments: [
          installment({ installmentNo: 1, status: 'Open', dueDate: '2026-03-10', totalAmount: 300 })
        ]
      })
    ]);

    expect(overview.totalOpenBalance).toBe(11000);
    expect(overview.totalMonthly).toBe(800);
    expect(overview.totalOpenInstallments).toBe(3);
    expect(overview.contractsCount).toBe(2);
    expect(overview.nextDueDate).toBe('2026-03-10');
    expect(overview.nextDueAmount).toBe(300);
    expect(overview.expectedPayoffDate).toBe('2026-06-10');
    // 1 paga de 4 no total
    expect(overview.paidPercent).toBe(25);
  });

  it('não soma mensalidade de contratos quitados', () => {
    const overview = buildLoansOverview([
      contract({ id: 'c1', status: 'Closed', monthlyPayment: 500, openBalance: 0 }),
      contract({ id: 'c2', status: 'Active', monthlyPayment: 300, openBalance: 3000 })
    ]);

    expect(overview.totalMonthly).toBe(300);
    expect(overview.activeCount).toBe(1);
  });

  it('lida com lista vazia sem quebrar', () => {
    const overview = buildLoansOverview([]);
    expect(overview.totalOpenBalance).toBe(0);
    expect(overview.nextDueDate).toBeNull();
    expect(overview.expectedPayoffDate).toBeNull();
    expect(overview.paidPercent).toBe(0);
    expect(buildContractViews([])).toEqual([]);
  });
});
