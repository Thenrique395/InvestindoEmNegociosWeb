import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LoansService, LoanContractResponse } from '../loans.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { LoanFormModalComponent } from './loan-form-modal.component';

class UiFeedbackServiceMock {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  warning = jasmine.createSpy('warning');
  info = jasmine.createSpy('info');
}

const parcela = (id: string, tipo: string) => ({
  id, installmentNo: 1, dueDate: '2026-03-10', beginningBalance: 12000,
  principalAmount: tipo === 'Sac' ? 500 : 450, interestAmount: 100,
  totalAmount: tipo === 'Sac' ? 600 : 550, endingBalance: 11500, status: 'Open'
});

const comparacao = {
  price: { monthlyPayment: 550, totalCost: 13200, totalInterest: 1200, amortizationType: 'Price', installments: [parcela('p1', 'Price')] },
  sac: { monthlyPayment: 600, totalCost: 13000, totalInterest: 1000, amortizationType: 'Sac', installments: [parcela('s1', 'Sac')] }
};

describe('LoanFormModalComponent', () => {
  let component: LoanFormModalComponent;
  let fixture: ComponentFixture<LoanFormModalComponent>;
  let loansService: jasmine.SpyObj<Pick<LoansService, 'create' | 'update' | 'simulate' | 'compare'>>;

  function montar(contract: LoanContractResponse | null = null): void {
    fixture = TestBed.createComponent(LoanFormModalComponent);
    component = fixture.componentInstance;
    component.contract = contract;
    component.ngOnInit();
  }

  beforeEach(async () => {
    loansService = jasmine.createSpyObj('LoansService', ['create', 'update', 'simulate', 'compare']);
    loansService.compare.and.returnValue(of(comparacao) as never);
    loansService.simulate.and.returnValue(of(comparacao.price) as never);
    loansService.create.and.returnValue(of({ id: 'novo' } as LoanContractResponse));
    loansService.update.and.returnValue(of({ id: 'c1' } as LoanContractResponse));

    await TestBed.configureTestingModule({
      imports: [LoanFormModalComponent],
      providers: [
        { provide: LoansService, useValue: loansService },
        { provide: UiFeedbackService, useClass: UiFeedbackServiceMock }
      ]
    }).compileComponents();
  });

  it('abre com valores de exemplo, já simuláveis', () => {
    montar();

    expect(component.form.title).toBe('Empréstimo pessoal');
    expect(component.form.principalAmount).toBeGreaterThan(0);
    expect(component.form.termMonths).toBeGreaterThan(0);
  });

  it('usa o dia recebido como data inicial e dia de pagamento', () => {
    fixture = TestBed.createComponent(LoanFormModalComponent);
    component = fixture.componentInstance;
    component.dataInicial = new Date(2026, 7, 15);
    component.ngOnInit();

    expect(component.form.startDate).toBe('2026-08-15');
    expect(component.form.paymentDay).toBe(15);
  });

  it('limita o dia de pagamento a 28', () => {
    fixture = TestBed.createComponent(LoanFormModalComponent);
    component = fixture.componentInstance;
    // Dia 31 não existe em todo mês; o contrato aceita no máximo 28.
    component.dataInicial = new Date(2026, 0, 31);
    component.ngOnInit();

    expect(component.form.paymentDay).toBe(28);
  });

  // Movido de loans.component.spec.ts: o comportamento saiu da página para cá.
  it('compare carrega a comparação e chooseSystem escolhe o sistema', () => {
    montar();

    component.compare();
    expect(loansService.compare).toHaveBeenCalled();
    expect(component.comparison()).toBeTruthy();

    component.chooseSystem('Sac');
    expect(component.form.amortizationType).toBe('Sac');
    expect(component.simulation()?.amortizationType).toBe('Sac');
    expect(component.comparison()).toBeNull();
  });

  // Movido de loans.component.spec.ts: simular saiu da página para cá.
  it('simula e preenche o cronograma', () => {
    montar();

    component.simulate();

    expect(loansService.simulate).toHaveBeenCalledWith(component.form);
    expect(component.simulation()?.monthlyPayment).toBe(550);
    expect(component.error()).toBe('');
  });

  it('cria o contrato e devolve o resultado a quem chamou', () => {
    const saved = jasmine.createSpy('saved');
    montar();
    component.saved.subscribe(saved);

    component.salvar();

    expect(loansService.create).toHaveBeenCalled();
    expect(loansService.update).not.toHaveBeenCalled();
    expect(saved).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'novo' }));
  });

  it('edita quando recebe um contrato, em vez de criar outro', () => {
    montar({ id: 'c1', title: 'Carro', principalAmount: 50000, annualInterestRate: 12, termMonths: 48, amortizationType: 'Price', startDate: '2026-01-10', paymentDay: 10 } as LoanContractResponse);

    expect(component.form.title).toBe('Carro');

    component.salvar();

    expect(loansService.update).toHaveBeenCalledWith('c1', jasmine.anything());
    expect(loansService.create).not.toHaveBeenCalled();
  });

  it('mostra o erro e não avisa quem chamou quando falha', () => {
    const saved = jasmine.createSpy('saved');
    loansService.create.and.returnValue(throwError(() => new Error('falhou')));
    montar();
    component.saved.subscribe(saved);

    component.salvar();

    expect(component.error()).toBeTruthy();
    expect(component.saving()).toBeFalse();
    expect(saved).not.toHaveBeenCalled();
  });

  it('ignora fechar enquanto grava', () => {
    const closed = jasmine.createSpy('closed');
    montar();
    component.close.subscribe(closed);
    component.saving.set(true);

    component.fechar();

    expect(closed).not.toHaveBeenCalled();
  });
});
