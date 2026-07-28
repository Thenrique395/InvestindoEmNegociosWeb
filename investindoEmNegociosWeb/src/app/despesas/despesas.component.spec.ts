import { of, throwError } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { DespesasComponent } from './despesas.component';
import { StoredCard, StoredExpense } from '../data/api-data.service';

function createComponent(): DespesasComponent {
  return new DespesasComponent(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { getRole: () => null } as any,
    {} as any,
    { canImportInvoices: () => true } as any,
    { markForCheck: jasmine.createSpy('markForCheck') } as any,
    { onDestroy: () => {} } as any,
    { queryParamMap: of(convertToParamMap({})) } as any
  );
}

function baseExpense(overrides: Partial<StoredExpense> = {}): StoredExpense {
  return {
    id: 'exp-1',
    nome: 'Despesa teste',
    categoria: 'Categoria',
    valor: 100,
    vencimento: '10/02/2026',
    ...overrides
  };
}

describe('DespesasComponent - competência de cartão no front', () => {
  it('deve exibir "À vista" quando a despesa não tem cartão', () => {
    const component = createComponent();
    const label = component.pagamentoLabel(baseExpense({ cartao: undefined }));
    expect(label).toBe('À vista');
  });

  it('deve exibir fatura MM/AAAA quando statementMonth e statementYear estiverem preenchidos', () => {
    const component = createComponent();
    const card: StoredCard = {
      id: 'card-1',
      bandeira: '1',
      numero: '1234567890123456',
      nome: 'Cartão principal',
      limiteCredito: 1000,
      diaFechamento: 10,
      diaVencimento: 15
    };
    component.cartoes.set([card]);
    component.cardBrandMap.set({ '1': 'VISA' });

    const label = component.pagamentoLabel(
      baseExpense({
        cartao: 'card-1',
        statementMonth: 3,
        statementYear: 2026
      })
    );

    expect(label).toContain('Cartão - VISA - 1234 *********** 3456');
    expect(label).toContain('Fatura 03/2026');
  });

  it('deve exibir apenas o cartão quando não houver competência preenchida', () => {
    const component = createComponent();
    const card: StoredCard = {
      id: 'card-1',
      bandeira: '1',
      numero: '1234567890123456',
      nome: 'Cartão principal',
      limiteCredito: 1000,
      diaFechamento: 10,
      diaVencimento: 15
    };
    component.cartoes.set([card]);
    component.cardBrandMap.set({ '1': 'VISA' });

    const label = component.pagamentoLabel(
      baseExpense({
        cartao: 'card-1',
        statementMonth: null,
        statementYear: null
      })
    );

    expect(label).toBe('Cartão - VISA - 1234 *********** 3456');
  });
});

class InstallmentsServiceMock {
  listPayments = jasmine.createSpy('listPayments').and.returnValue(of([]));
  uploadReceipt = jasmine.createSpy('uploadReceipt').and.returnValue(of({ receiptUrl: 'http://x/receipt.pdf' }));
}

class UiFeedbackServiceMock {
  success = jasmine.createSpy('success');
  warning = jasmine.createSpy('warning');
  error = jasmine.createSpy('error');
  info = jasmine.createSpy('info');
}

function createComponentForReceiptTests() {
  const installments = new InstallmentsServiceMock();
  const uiFeedback = new UiFeedbackServiceMock();
  const component = new DespesasComponent(
    {} as any,
    installments as any,
    {} as any,
    {} as any,
    {} as any,
    { getRole: () => null } as any,
    uiFeedback as any,
    { canImportInvoices: () => true } as any,
    { markForCheck: jasmine.createSpy('markForCheck') } as any,
    { onDestroy: () => {} } as any,
    { queryParamMap: of(convertToParamMap({})) } as any
  );
  return { component, installments, uiFeedback };
}

function buildPayment(overrides: Partial<{ id: string; paidAmount: number; paidAt: string }> = {}) {
  return { id: 'pay-1', paidAmount: 100, paidAt: '2026-06-10T00:00:00Z', ...overrides };
}

describe('DespesasComponent - fechar modal ao salvar', () => {
  it('fecha o modal (mostrarForm=false) quando a despesa é salva com sucesso', () => {
    // Regressão: o finalize (saving=false) roda depois do next; se fecharModal() for chamado
    // com saving ainda true, o guard bloqueia e o modal não fecha. Com o fix (saving=false
    // antes de fechar no next), o modal fecha.
    const db = { addExpense: jasmine.createSpy('addExpense').and.returnValue(of({})) };
    const uiFeedback = new UiFeedbackServiceMock();
    const component = new DespesasComponent(
      db as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { getRole: () => null } as any,
      uiFeedback as any,
      { canImportInvoices: () => true } as any,
      { markForCheck: jasmine.createSpy('markForCheck') } as any,
      { onDestroy: () => {} } as any,
      { queryParamMap: of(convertToParamMap({})) } as any
    );

    component.mostrarForm = true;
    (component as any).editando = null;
    (component as any).novaDespesa = { nome: 'Despesa teste', categoria: 'Categoria', categoryId: 'cat-1' };
    // parseValor é público e sensível a locale — spy garante valor válido independente do ambiente.
    spyOn(component, 'parseValor').and.returnValue(100);
    component.valorInput = '100';
    // Data com dia e mês <= 12: válida em qualquer locale (month-first ou day-first).
    component.vencimentoInput = '05/08/2026';

    component.adicionar();

    expect(db.addExpense).toHaveBeenCalled();
    expect(component.saving).toBeFalse();
    expect(component.mostrarForm).toBeFalse();
  });
});

describe('DespesasComponent - anexo de comprovante', () => {
  it('não abre o anexo quando a despesa ainda não foi paga', () => {
    const { component, uiFeedback } = createComponentForReceiptTests();

    component.prepararAnexoComprovante({ id: 'exp-1', status: 'OPEN' } as StoredExpense);

    expect(uiFeedback.info).toHaveBeenCalled();
    expect((component as any).receiptUploadTargetId).toBeNull();
  });

  it('permite preparar o anexo quando a despesa está paga ou parcialmente paga', () => {
    const { component, uiFeedback } = createComponentForReceiptTests();

    component.prepararAnexoComprovante({ id: 'exp-1', status: 'PAID' } as StoredExpense);

    expect(uiFeedback.info).not.toHaveBeenCalled();
    expect((component as any).receiptUploadTargetId).toBe('exp-1');
  });

  it('envia o comprovante do pagamento mais recente ao selecionar um arquivo', () => {
    const { component, installments, uiFeedback } = createComponentForReceiptTests();
    installments.listPayments.and.returnValue(of([
      buildPayment({ id: 'pay-1', paidAmount: 100, paidAt: '2026-06-01T00:00:00Z' }),
      buildPayment({ id: 'pay-2', paidAmount: 50, paidAt: '2026-06-10T00:00:00Z' })
    ]));
    component.prepararAnexoComprovante({ id: 'exp-1', status: 'PAID' } as StoredExpense);
    const file = new File(['conteudo'], 'comprovante.pdf');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onComprovanteFileSelected({ target: input } as unknown as Event);

    expect(installments.uploadReceipt).toHaveBeenCalledWith('exp-1', 'pay-2', file);
    expect(uiFeedback.success).toHaveBeenCalled();
    expect(component.isAttachingReceipt('exp-1')).toBeFalse();
  });

  it('avisa quando não há pagamento elegível para anexar comprovante', () => {
    const { component, installments, uiFeedback } = createComponentForReceiptTests();
    installments.listPayments.and.returnValue(of([buildPayment({ paidAmount: 0 })]));
    component.prepararAnexoComprovante({ id: 'exp-1', status: 'PAID' } as StoredExpense);
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.pdf')] });

    component.onComprovanteFileSelected({ target: input } as unknown as Event);

    expect(installments.uploadReceipt).not.toHaveBeenCalled();
    expect(uiFeedback.info).toHaveBeenCalled();
  });

  it('mostra erro quando o upload do comprovante falha', () => {
    const { component, installments, uiFeedback } = createComponentForReceiptTests();
    installments.listPayments.and.returnValue(of([buildPayment()]));
    installments.uploadReceipt.and.returnValue(throwError(() => new Error('falhou')));
    component.prepararAnexoComprovante({ id: 'exp-1', status: 'PAID' } as StoredExpense);
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.pdf')] });

    component.onComprovanteFileSelected({ target: input } as unknown as Event);

    expect(uiFeedback.error).toHaveBeenCalled();
    expect(component.isAttachingReceipt('exp-1')).toBeFalse();
  });

  it('ignora a seleção quando nenhum arquivo é escolhido', () => {
    const { component, installments } = createComponentForReceiptTests();
    component.prepararAnexoComprovante({ id: 'exp-1', status: 'PAID' } as StoredExpense);
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });

    component.onComprovanteFileSelected({ target: input } as unknown as Event);

    expect(installments.listPayments).not.toHaveBeenCalled();
  });
});
