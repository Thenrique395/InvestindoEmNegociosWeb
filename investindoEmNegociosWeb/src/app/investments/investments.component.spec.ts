import { of, throwError } from 'rxjs';
import { InvestmentsComponent } from './investments.component';
import { InvestmentPosition } from '../investments.service';

describe('InvestmentsComponent', () => {
  function createComponent(overrides?: {
    investments?: any;
    lookups?: any;
    uiFeedback?: any;
  }) {
    const investments = overrides?.investments ?? {
      getGoal: jasmine.createSpy().and.returnValue(of(null)),
      upsertGoal: jasmine.createSpy().and.returnValue(of({ targetAmount: 1000 })),
      getAllocationTarget: jasmine.createSpy().and.returnValue(of({ rf: 40, acoes: 35, fundos: 20, cripto: 5 })),
      upsertAllocationTarget: jasmine.createSpy().and.returnValue(of({ rf: 25, acoes: 25, fundos: 25, cripto: 25 })),
      listPositions: jasmine.createSpy().and.returnValue(of([])),
      createPosition: jasmine.createSpy().and.returnValue(of({ id: 'p-new' })),
      addMovement: jasmine.createSpy().and.returnValue(of({})),
      extractB3Report: jasmine.createSpy().and.returnValue(of({ importToken: 'tok', totals: { positions: 0, incomes: 0, trades: 0 }, positions: [], incomes: [], trades: [] })),
      importB3Report: jasmine.createSpy().and.returnValue(of({ imported: 1 }))
    };
    const lookups = overrides?.lookups ?? {
      institutions: jasmine.createSpy().and.returnValue(of([]))
    };
    const uiFeedback = overrides?.uiFeedback ?? {
      success: jasmine.createSpy(),
      error: jasmine.createSpy(),
      warning: jasmine.createSpy()
    };

    return {
      component: new InvestmentsComponent(investments, lookups, uiFeedback),
      investments,
      lookups,
      uiFeedback
    };
  }

  function position(partial?: Partial<InvestmentPosition>): InvestmentPosition {
    return {
      id: partial?.id ?? 'p1',
      type: partial?.type ?? 'ACOES',
      asset: partial?.asset ?? 'PETR4',
      quantity: partial?.quantity ?? 10,
      avgPrice: partial?.avgPrice ?? 20,
      openedAt: partial?.openedAt ?? '2026-01-01',
      account: partial?.account ?? 'XP',
      category: partial?.category ?? 'Ações',
      note: partial?.note,
      movements: partial?.movements ?? [],
      marketPrice: partial?.marketPrice,
      marketName: partial?.marketName,
      marketLogoUrl: partial?.marketLogoUrl
    };
  }

  it('deve filtrar posições por texto, tipo, conta e status', () => {
    const { component } = createComponent();
    component.positions = [
      position({ id: '1', asset: 'PETR4', type: 'ACOES', account: 'XP', quantity: 10 }),
      position({ id: '2', asset: 'Casa Praia', type: 'IMOVEL', account: 'Patrimonio', quantity: 1 }),
      position({ id: '3', asset: 'BTC', type: 'CRIPTO', account: 'Binance', quantity: 0 })
    ];
    component.searchTerm = 'casa';
    component.filterType = 'IMOVEL';
    component.filterAccount = 'Patrimonio';
    component.filterStatus = 'ACTIVE';

    expect(component.filteredPositions.map((item) => item.id)).toEqual(['2']);
  });

  it('deve classificar imóvel e veículo como patrimônio em tipoPapel', () => {
    const { component } = createComponent();

    expect(component.tipoPapel(position({ type: 'IMOVEL' }))).toBe('Patrimônio');
    expect(component.tipoPapel(position({ type: 'VEICULO' }))).toBe('Patrimônio');
  });

  it('deve expor allocationTypes apenas com classes financeiras', () => {
    const { component } = createComponent();

    expect(component.allocationTypes.map((item) => item.value)).toEqual(['RF', 'ACOES', 'FUNDOS', 'CRIPTO']);
  });

  it('deve incluir cores para ativos reais na distribuição', () => {
    const { component } = createComponent();
    component.positions = [
      position({ type: 'IMOVEL', asset: 'Casa', quantity: 1, avgPrice: 200000 }),
      position({ type: 'VEICULO', asset: 'Carro', quantity: 1, avgPrice: 80000 })
    ];

    const chart = component.distribuicaoPorTipoComCor;

    expect(chart.find((item) => item.key === 'IMOVEL')?.color).toBe('#8b5cf6');
    expect(chart.find((item) => item.key === 'VEICULO')?.color).toBe('#ef4444');
  });

  it('deve limitar updateTargetAllocation entre 0 e 100', () => {
    const { component } = createComponent();

    component.updateTargetAllocation('RF', 140);
    component.updateTargetAllocation('ACOES', -5);

    expect(component.targetAllocation.RF).toBe(100);
    expect(component.targetAllocation.ACOES).toBe(0);
  });

  it('deve bloquear saveTargetAllocation quando a soma não fecha 100%', () => {
    const { component, investments, uiFeedback } = createComponent();
    component.targetAllocation = { RF: 50, ACOES: 50, FUNDOS: 10, CRIPTO: 0 };

    component.saveTargetAllocation();

    expect(investments.upsertAllocationTarget).not.toHaveBeenCalled();
    expect(uiFeedback.error).toHaveBeenCalled();
  });

  it('deve salvar alocação alvo com sucesso', () => {
    const { component, investments, uiFeedback } = createComponent();
    component.showAlocacaoConfig = true;
    component.targetAllocation = { RF: 25, ACOES: 25, FUNDOS: 25, CRIPTO: 25 };

    component.saveTargetAllocation();

    expect(investments.upsertAllocationTarget).toHaveBeenCalled();
    expect(component.showAlocacaoConfig).toBeFalse();
    expect(uiFeedback.success).toHaveBeenCalled();
  });

  it('deve resetar alocação para o padrão', () => {
    const { component, investments } = createComponent();
    component.targetAllocation = { RF: 10, ACOES: 60, FUNDOS: 20, CRIPTO: 10 };

    component.resetTargetAllocation();

    expect(component.targetAllocation).toEqual({ RF: 25, ACOES: 25, FUNDOS: 25, CRIPTO: 25 });
    expect(investments.upsertAllocationTarget).toHaveBeenCalled();
  });

  it('deve sugerir rebalanceamento quando houver desvio alto', () => {
    const { component } = createComponent();
    component.positions = [position({ type: 'ACOES', quantity: 10, avgPrice: 100 })];

    expect(component.proximaAcao.titulo).toContain('Rebalancear');
  });

  it('deve sugerir novo aporte quando não houver movimento no mês', () => {
    const { component } = createComponent();
    component.positions = [position({ type: 'RF', quantity: 1, avgPrice: 100, movements: [] })];
    component.targetAllocation = { RF: 100, ACOES: 0, FUNDOS: 0, CRIPTO: 0 };

    expect(component.proximaAcao.openForm).toBeTrue();
  });

  it('deve aceitar IMOVEL e VEICULO no parseCsvRows', () => {
    const { component } = createComponent();
    const csv = [
      'type;asset;quantity;avgPrice;openedAt;account;category;note',
      'IMOVEL;Casa;1;250000;2026-01-01;Patrimonio;Imovel;Manual',
      'VEICULO;Carro;1;80000;2026-01-01;Patrimonio;Veiculo;Manual'
    ].join('\n');

    const rows = (component as any).parseCsvRows(csv);

    expect(rows.length).toBe(2);
    expect(rows[0].type).toBe('IMOVEL');
    expect(rows[1].type).toBe('VEICULO');
  });

  it('deve rejeitar CSV com cabeçalho inválido', () => {
    const { component } = createComponent();

    expect(() => (component as any).parseCsvRows('asset;quantity\nPETR4;10')).toThrow();
  });

  it('deve importar CSV e atualizar contagem', async () => {
    const { component, investments, uiFeedback } = createComponent();
    spyOn<any>(component, 'carregarPosicoes');
    const file = { text: async () => 'type;asset;quantity;avgPrice;openedAt;account;category;note\nACOES;PETR4;10;20;2026-01-01;XP;Ações;' } as File;
    const event = { target: { files: [file], value: 'x' } } as unknown as Event;

    await component.onCsvSelected(event);

    expect(component.csvImported).toBe(1);
    expect(investments.createPosition).toHaveBeenCalled();
    expect(uiFeedback.success).toHaveBeenCalled();
  });

  it('deve preencher csvError quando importação CSV falhar', async () => {
    const { component } = createComponent();
    const file = { text: async () => 'type;asset;quantity;avgPrice;openedAt;account\nINVALIDO;PETR4;10;20;2026-01-01;XP' } as File;
    const event = { target: { files: [file], value: 'x' } } as unknown as Event;

    await component.onCsvSelected(event);

    expect(component.csvError).toContain('Tipo inválido');
  });

  it('deve exigir token para confirmar importação B3', () => {
    const { component } = createComponent();
    component.b3Preview = { totals: { positions: 0, incomes: 0, trades: 0 }, positions: [], incomes: [], trades: [] };

    component.confirmarImportacaoB3();

    expect(component.b3Error).toContain('token');
  });

  it('deve registrar erro quando venda excede quantidade da posição', async () => {
    const { component, uiFeedback } = createComponent();
    component.positions = [position({ id: 'p1', quantity: 2 })];
    component.vendaPositionId = 'p1';
    component.venda = { quantity: 3, price: 20, date: '2026-01-01', note: '' };

    await component.salvarVenda();

    expect(uiFeedback.error).toHaveBeenCalled();
  });

  it('deve autoselecionar posição vendável única ao mudar para venda', () => {
    const { component } = createComponent();
    component.positions = [position({ id: 'only', quantity: 4, avgPrice: 33 })];

    component.setCadastroOperacao('VENDA');

    expect(component.vendaPositionId).toBe('only');
    expect(component.venda.price).toBe(33);
  });

  it('deve usar preço de mercado no valor atual da posição quando disponível', () => {
    const { component } = createComponent();

    expect(component.valorAtualPosicao(position({ quantity: 2, avgPrice: 10, marketPrice: 15 }))).toBe(30);
  });

  it('deve aplicar fallback da alocação e alertar uma vez quando o carregamento falhar', () => {
    const investments = {
      getGoal: jasmine.createSpy().and.returnValue(of(null)),
      getAllocationTarget: jasmine.createSpy().and.returnValues(
        throwError(() => ({ status: 500 })),
        throwError(() => ({ status: 500 }))
      ),
      listPositions: jasmine.createSpy().and.returnValue(of([]))
    };
    const uiFeedback = {
      success: jasmine.createSpy(),
      error: jasmine.createSpy(),
      warning: jasmine.createSpy()
    };
    const { component } = createComponent({ investments, uiFeedback });

    (component as any).carregarAlocacaoTarget();
    (component as any).carregarAlocacaoTarget();

    expect(component.targetAllocation).toEqual({ RF: 40, ACOES: 35, FUNDOS: 20, CRIPTO: 5 });
    expect(uiFeedback.warning).toHaveBeenCalledTimes(1);
  });

  it('deve restaurar aba salva do localStorage', () => {
    const { component } = createComponent();
    window.localStorage.setItem('investments.activeTab', 'ANALISE');

    (component as any).restoreTab();

    expect(component.activeTab).toBe('ANALISE');
  });

  it('deve mudar a aba para RENTABILIDADE ao preparar scroll de evolução', () => {
    const { component } = createComponent();
    spyOn(component, 'setActiveTab');

    (component as any).ensureTabForTarget('sec-evolucao');

    expect(component.setActiveTab).toHaveBeenCalledWith('RENTABILIDADE');
  });
});
