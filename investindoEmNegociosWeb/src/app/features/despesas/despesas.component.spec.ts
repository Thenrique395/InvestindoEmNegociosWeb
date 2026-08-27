import { of, throwError } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { DespesasComponent } from './despesas.component';
import { StoredCard, StoredExpense } from '../../core/data/api-data.service';

function createComponent(role: string | null = null, uiFeedback?: unknown): DespesasComponent {
  return new DespesasComponent(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { getRole: () => role } as any,
    (uiFeedback ?? {}) as any,
    { canImportInvoices: () => true } as any,
    { markForCheck: jasmine.createSpy('markForCheck') } as any,
    { onDestroy: () => {} } as any,
    { queryParamMap: of(convertToParamMap({})) } as any,
    { replaceState: jasmine.createSpy('replaceState') } as any,
    { navigateByUrl: jasmine.createSpy('navigateByUrl') } as any,
    { history: jasmine.createSpy('history').and.returnValue(of({ planId: 'p1', schedule: 'OneTime', installments: [], events: [] })) } as any
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

    // Sem máscara: os asteriscos ocupavam metade da coluna sem identificar nada
    // — quem reconhece o cartão reconhece pelos quatro finais.
    expect(label).toContain('Cartão - VISA - 3456');
    expect(label).not.toContain('*');
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

    expect(label).toBe('Cartão - VISA - 3456');
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
    { queryParamMap: of(convertToParamMap({})) } as any,
    { replaceState: jasmine.createSpy('replaceState') } as any,
    { navigateByUrl: jasmine.createSpy('navigateByUrl') } as any,
    { history: jasmine.createSpy('history').and.returnValue(of({ planId: 'p1', schedule: 'OneTime', installments: [], events: [] })) } as any
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
      { queryParamMap: of(convertToParamMap({})) } as any,
    { replaceState: jasmine.createSpy('replaceState') } as any,
    { navigateByUrl: jasmine.createSpy('navigateByUrl') } as any,
    { history: jasmine.createSpy('history').and.returnValue(of({ planId: 'p1', schedule: 'OneTime', installments: [], events: [] })) } as any
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

function makeDespesas(db: any, ui = new UiFeedbackServiceMock()) {
  const component = new DespesasComponent(
    db as any, {} as any, {} as any, {} as any, {} as any,
    { getRole: () => 'Advanced' } as any, ui as any,
    { canImportInvoices: () => true } as any,
    { markForCheck: jasmine.createSpy('markForCheck') } as any,
    { onDestroy: () => {} } as any,
    { queryParamMap: of(convertToParamMap({})) } as any,
    { replaceState: jasmine.createSpy('replaceState') } as any,
    { navigateByUrl: jasmine.createSpy('navigateByUrl') } as any,
    { history: jasmine.createSpy('history').and.returnValue(of({ planId: 'p1', schedule: 'OneTime', installments: [], events: [] })) } as any
  );
  return { component, ui };
}

function setDespesaForm(component: DespesasComponent, nome: string, valor: number) {
  (component as any).novaDespesa = { nome, categoria: 'Categoria', categoryId: 'cat-1', valor, vencimento: '05/08/2026' };
  spyOn(component, 'parseValor').and.returnValue(valor);
  component.valorInput = String(valor);
  component.vencimentoInput = '05/08/2026';
}

describe('DespesasComponent - fluxos de cadastro/edição (cobertura)', () => {
  it('adicionar sem nome mostra erro e não persiste (#2)', () => {
    const db = { addExpense: jasmine.createSpy('addExpense').and.returnValue(of({})) };
    const { component, ui } = makeDespesas(db);
    (component as any).editando = null;
    setDespesaForm(component, '', 100);
    component.adicionar();
    expect(ui.error).toHaveBeenCalled();
    expect(db.addExpense).not.toHaveBeenCalled();
  });

  it('adicionar sem valor mostra erro e não persiste (#2)', () => {
    const db = { addExpense: jasmine.createSpy('addExpense').and.returnValue(of({})) };
    const { component, ui } = makeDespesas(db);
    (component as any).editando = null;
    setDespesaForm(component, 'Aluguel', 0);
    component.adicionar();
    expect(ui.error).toHaveBeenCalled();
    expect(db.addExpense).not.toHaveBeenCalled();
  });

  it('editar despesa recorrente abre modal de escopo e FECHA o formulário (fix z-index)', () => {
    const { component } = makeDespesas({});
    (component as any).editando = { id: 'exp-1', planId: 'plan-1', isParcela: false, isRecorrente: true, originalNome: 'Aluguel', originalCategoryId: 'cat-1' };
    setDespesaForm(component, 'Aluguel', 100);
    component.mostrarForm = true;
    component.adicionar();
    expect(component.confirmEdicao).not.toBeNull();
    expect(component.mostrarForm).toBeFalse();
  });

  it('cancelar o modal de escopo reabre o formulário', () => {
    const { component } = makeDespesas({});
    (component as any).confirmEdicao = { isRecorrente: true };
    component.mostrarForm = false;
    component.cancelarEdicao();
    expect(component.confirmEdicao).toBeNull();
    expect(component.mostrarForm).toBeTrue();
  });

  it('confirmarEdicao("single") edita só a parcela (updateExpenseInstallment)', () => {
    const db = { updateExpenseInstallment: jasmine.createSpy('uei').and.returnValue(of(void 0)), updateExpense: jasmine.createSpy('ue').and.returnValue(of(void 0)) };
    const { component } = makeDespesas(db);
    (component as any).editando = { id: 'exp-1', planId: 'plan-1', isParcela: true, isRecorrente: false, originalNome: 'X', originalCategoryId: 'cat-1' };
    setDespesaForm(component, 'X', 150);
    component.confirmarEdicao('single');
    expect(db.updateExpenseInstallment).toHaveBeenCalled();
    expect(db.updateExpense).not.toHaveBeenCalled();
  });

  it('confirmarEdicao("all") edita a série inteira (updateExpense)', () => {
    const db = { updateExpenseInstallment: jasmine.createSpy('uei').and.returnValue(of(void 0)), updateExpense: jasmine.createSpy('ue').and.returnValue(of(void 0)) };
    const { component } = makeDespesas(db);
    (component as any).editando = { id: 'exp-1', planId: 'plan-1', isParcela: true, isRecorrente: false, originalNome: 'X', originalCategoryId: 'cat-1' };
    setDespesaForm(component, 'X', 150);
    component.confirmarEdicao('all');
    expect(db.updateExpense).toHaveBeenCalled();
    expect(db.updateExpenseInstallment).not.toHaveBeenCalled();
  });

  it('clampa parcelas do cartão em no máximo 36 (#3)', () => {
    const db = { addExpense: jasmine.createSpy('addExpense').and.returnValue(of({})) };
    const { component } = makeDespesas(db);
    (component as any).editando = null;
    setDespesaForm(component, 'TV', 100);
    component.formaPagamento = 'cartao';
    component.parcelar = true;
    component.parcelasCount = 999;
    component.cartaoSelecionadoId = 'card-1';
    component.adicionar();
    expect(db.addExpense.calls.mostRecent().args[0].parcelasTotal).toBe(36);
  });

  it('clampa duração de despesa fixa em no máximo 120 (#3)', () => {
    const db = { addExpense: jasmine.createSpy('addExpense').and.returnValue(of({})) };
    const { component } = makeDespesas(db);
    (component as any).editando = null;
    setDespesaForm(component, 'Aluguel', 100);
    component.formaPagamento = 'avista';
    component.fixa = true;
    component.fixaMeses = 999;
    component.adicionar();
    expect(db.addExpense.calls.mostRecent().args[0].fixaMeses).toBe(120);
  });
});

describe('DespesasComponent - exclusão', () => {
  const despesaBase = {
    id: 'exp-1',
    nome: 'Mercado',
    valor: 100,
    vencimento: '05/08/2026',
    categoria: 'Alimentação'
  } as any;

  it('avulsa abre a confirmação em vez de excluir direto', () => {
    const db = { removeExpense: jasmine.createSpy('removeExpense').and.returnValue(of(void 0)) };
    const { component } = makeDespesas(db);

    component.openRemocao({ ...despesaBase }, '2026-08', 0);

    expect(component.confirmRemocao).not.toBeNull();
    expect(component.confirmRemocao!.kind).toBe('single');
    expect(component.confirmRemocao!.nome).toBe('Mercado');
    // Nada é removido antes de confirmar.
    expect(db.removeExpense).not.toHaveBeenCalled();
  });

  it('despesa de cartão pode ser excluída — o bloqueio do front não existia na API', () => {
    const db = { removeExpense: jasmine.createSpy('removeExpense').and.returnValue(of(void 0)) };
    const { component, ui } = makeDespesas(db);

    component.openRemocao({ ...despesaBase, cartao: 'card-1' }, '2026-08', 0);

    expect(ui.error).not.toHaveBeenCalled();
    expect(component.confirmRemocao).not.toBeNull();

    component.confirmarRemocao('single');
    expect(db.removeExpense).toHaveBeenCalledWith('exp-1');
  });

  it('parcelada de cartão exclui a série inteira quando o escopo é "all"', () => {
    const db = {
      removeExpense: jasmine.createSpy('removeExpense').and.returnValue(of(void 0)),
      removeExpenseSeries: jasmine.createSpy('removeExpenseSeries').and.returnValue(of(void 0))
    };
    const { component } = makeDespesas(db);

    component.openRemocao(
      { ...despesaBase, cartao: 'card-1', planId: 'plan-1', serieId: 'plan-1', parcelasTotal: 3 },
      '2026-08',
      0
    );
    expect(component.confirmRemocao!.kind).toBe('series');

    component.confirmarRemocao('all');
    expect(db.removeExpenseSeries).toHaveBeenCalledWith('plan-1');
    expect(db.removeExpense).not.toHaveBeenCalled();
  });

  it('recorrente encerra a recorrência com escopo "all" e mantém as demais com "single"', () => {
    const db = {
      removeExpense: jasmine.createSpy('removeExpense').and.returnValue(of(void 0)),
      removeExpenseSeries: jasmine.createSpy('removeExpenseSeries').and.returnValue(of(void 0))
    };
    const { component } = makeDespesas(db);

    component.openRemocao({ ...despesaBase, fixa: true, planId: 'plan-9' }, '2026-08', 0);
    expect(component.confirmRemocao!.kind).toBe('recurring');

    component.confirmarRemocao('single');
    expect(db.removeExpense).toHaveBeenCalledWith('exp-1');
    expect(db.removeExpenseSeries).not.toHaveBeenCalled();
  });

  it('cancelar fecha a confirmação sem remover nada', () => {
    const db = { removeExpense: jasmine.createSpy('removeExpense').and.returnValue(of(void 0)) };
    const { component } = makeDespesas(db);

    component.openRemocao({ ...despesaBase }, '2026-08', 0);
    component.cancelarRemocao();

    expect(component.confirmRemocao).toBeNull();
    expect(db.removeExpense).not.toHaveBeenCalled();
  });

  it('erro da API vira mensagem de domínio e a confirmação fecha', () => {
    const db = {
      removeExpense: jasmine
        .createSpy('removeExpense')
        .and.returnValue(throwError(() => ({ error: { detail: 'Parcela já paga.' } })))
    };
    const { component, ui } = makeDespesas(db);

    component.openRemocao({ ...despesaBase }, '2026-08', 0);
    component.confirmarRemocao('single');

    expect(component.confirmRemocao).toBeNull();
    expect(ui.error).toHaveBeenCalled();
  });
});

describe('DespesasComponent - aviso de competência da fatura', () => {
  function comCache(component: DespesasComponent, lista: unknown[]): void {
    (component as any).expensesCache = lista;
  }

  it('avisa em que fatura a despesa de cartão caiu quando não é o mês aberto', () => {
    const { component, ui } = makeDespesas({});
    component.dataAtual = new Date(2026, 7, 1); // agosto/2026
    (component as any).avisoDeCompetenciaPendente = { nome: 'Notebook', cartaoId: 'card-1' };
    comCache(component, [{ nome: 'Notebook', cartao: 'card-1', vencimento: '10/09/2026', valor: 100 }]);

    (component as any).resolverAvisoDeCompetencia();

    expect(ui.info).toHaveBeenCalled();
    expect((ui.info as jasmine.Spy).calls.mostRecent().args[0]).toContain('setembro de 2026');
    expect((component as any).avisoDeCompetenciaPendente).toBeNull();
  });

  it('não avisa quando a despesa caiu no mês aberto', () => {
    const { component, ui } = makeDespesas({});
    component.dataAtual = new Date(2026, 7, 1);
    (component as any).avisoDeCompetenciaPendente = { nome: 'Mercado', cartaoId: 'card-1' };
    comCache(component, [{ nome: 'Mercado', cartao: 'card-1', vencimento: '10/08/2026', valor: 100 }]);

    (component as any).resolverAvisoDeCompetencia();

    expect(ui.info).not.toHaveBeenCalled();
    expect((component as any).avisoDeCompetenciaPendente).toBeNull();
  });

  it('mantém o aviso pendente enquanto os dados não chegam', () => {
    const { component, ui } = makeDespesas({});
    (component as any).avisoDeCompetenciaPendente = { nome: 'Notebook', cartaoId: 'card-1' };
    comCache(component, []);

    (component as any).resolverAvisoDeCompetencia();

    expect(ui.info).not.toHaveBeenCalled();
    expect((component as any).avisoDeCompetenciaPendente).not.toBeNull();
  });
});

describe('DespesasComponent - antecipação e plano', () => {
  function feedbackFake() {
    return { success: jasmine.createSpy('success'), error: jasmine.createSpy('error'), info: jasmine.createSpy('info') };
  }

  /** Coloca uma despesa selecionada com o vencimento pedido. */
  function comSelecao(role: string, vencimento: string, uiFeedback?: unknown): DespesasComponent {
    const c = createComponent(role, uiFeedback);
    const despesa = baseExpense({ id: 'sel-1', vencimento, status: 'OPEN' });
    (c as any).despesasPorMes.set({ [(c as any).mesKey()]: [despesa] });
    c.selectedIds.add('sel-1');
    return c;
  }

  function emMesFuturo(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 2, 15);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function noMesCorrente(): string {
    const d = new Date();
    d.setDate(1);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  it('não oferece a ação quando a seleção é do mês corrente', () => {
    const c = comSelecao('Advanced', noMesCorrente());

    const rotulos = c.bulkActions.map((a: { label: string }) => a.label);

    // Antecipar só vale para parcela futura; botão que só sabe recusar é pior
    // que botão nenhum.
    expect(rotulos).not.toContain('Solicitar antecipação');
    expect(rotulos).toContain('Excluir');
  });

  it('oferece a ação quando a seleção é de mês futuro, mesmo sem o plano', () => {
    const c = comSelecao('Basic', emMesFuturo());

    const rotulos = c.bulkActions.map((a: { label: string }) => a.label);

    // O recurso existe para esta seleção — só não está liberado. Esconder aqui
    // deixaria o usuário sem saber que ele existe.
    expect(rotulos).toContain('Solicitar antecipação');
  });

  it('quem não tem o plano descobre qual libera, ao clicar', () => {
    const uiFeedback = feedbackFake();
    const basic = comSelecao('Basic', emMesFuturo(), uiFeedback);

    basic.anteciparSelecionadas();

    expect(uiFeedback.info).toHaveBeenCalled();
    const msg = uiFeedback.info.calls.mostRecent().args[0] as string;
    // O nome comercial vem de plan-labels; o teste não repete a string à mão,
    // só exige que o aviso nomeie um plano em vez de dizer "planos pagos".
    expect(msg).toContain('Plano');
    expect(msg).toContain('Antecipação');
  });

  it('quem tem o plano não é barrado pela mensagem de plano', () => {
    const uiFeedback = feedbackFake();
    const inter = createComponent('Intermediate', uiFeedback);

    inter.anteciparSelecionadas();

    // Passa da trava de plano e esbarra na próxima regra (nada selecionado).
    const chamadas = [...uiFeedback.info.calls.all(), ...uiFeedback.error.calls.all()];
    const mensagens = chamadas.map((c) => String(c.args[0]));
    expect(mensagens.some((m) => m.includes('Plano'))).toBeFalse();
  });
});
