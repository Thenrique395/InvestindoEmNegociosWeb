import { of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import { buildUpcomingView } from './upcoming-card/upcoming-card.model';
import { NotificationItem } from '../../core/notifications.service';
import { DebtSummaryResponse, SubscriptionsSummaryResponse } from '../../core/accounts.service';
import { InvestmentPosition } from '../../core/investments.service';

function createComponent(): HomeComponent {
  return new HomeComponent(
    { expenses$: of([]), incomes$: of([]), cards$: of([]) } as any,
    { list: () => of([]) } as any,
    { debtTotal: () => of({ total: 0 }) } as any,
    { getStatus: () => of({ step: 0, completed: true }), updateStatus: () => of({}) } as any,
    { list: () => of([]), resolveDefaultAccountId: () => null, getRealAvailableBalance: () => of(null), getDebtSummary: () => of(null), getNetWorthSummary: () => of(null), getNetWorthHistory: () => of(null), getProjection: () => of(null), getRiskAssessment: () => of(null), getInsights: () => of(null), getRecommendations: () => of(null) } as any,
    { getRole: () => 'Basic' } as any,
    { getProfile: () => of(null) } as any,
    { list: () => of([]) } as any,
    { health: () => of(null) } as any,
    { get: () => of(null) } as any,
    { listPositions: () => of([]) } as any,
    { navigateByUrl: jasmine.createSpy() } as any,
    { onDestroy: () => {} } as any
  );
}

function localeDateFromToday(offsetDays: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

describe('HomeComponent smoke', () => {
  it('deve consumir o insight mais recente e preencher dicas/breakdown', () => {
    const component = createComponent();
    const oldInsight: NotificationItem = {
      id: 'n1',
      title: 'Antigo',
      message: 'Dicas: A | B.',
      kind: 'CashflowInsight',
      createdAt: '2026-01-01T00:00:00Z',
      payload: { tips: ['old'], scoreBreakdown: ['old score'] }
    };
    const latestInsight: NotificationItem = {
      id: 'n2',
      title: 'Novo',
      message: 'msg',
      kind: 'CashflowInsight',
      createdAt: '2026-02-01T00:00:00Z',
      payload: { tips: ['revisar despesas', 'confirmar receita'], scoreBreakdown: ['Base: 100', '- 10 risco'] }
    };

    (component as any).consumeRobotInsight([oldInsight, latestInsight]);

    expect(component.robotInsightTips).toEqual(['revisar despesas', 'confirmar receita']);
    expect(component.robotScoreBreakdown).toEqual(['Base: 100', '- 10 risco']);
  });

  it('deve resetar dicas quando não houver CashflowInsight', () => {
    const component = createComponent();
    component.robotInsightTips = ['x'];
    component.robotScoreBreakdown = ['y'];

    (component as any).consumeRobotInsight([
      { id: 'n1', title: 'x', message: 'y', kind: 'ExpenseUpcoming', createdAt: '2026-02-01T00:00:00Z' }
    ] as NotificationItem[]);

    expect(component.robotInsightTips).toEqual([]);
    expect(component.robotScoreBreakdown).toEqual([]);
  });

  it('deve extrair dicas do texto quando payload não existir', () => {
    const component = createComponent();
    const insight: NotificationItem = {
      id: 'n1',
      title: 'Insight',
      message: 'Resumo. Dicas: Pagar hoje | Evitar compras | Confirmar recebimentos.',
      kind: 'CashflowInsight',
      createdAt: '2026-02-01T00:00:00Z'
    };

    (component as any).consumeRobotInsight([insight]);

    expect(component.robotInsightTips).toEqual(['Pagar hoje', 'Evitar compras', 'Confirmar recebimentos.']);
  });

  it('deve aplicar prioridade e recomendações do robô quando insight estiver fresco', () => {
    const component = createComponent();
    (component as any).expensesLoaded = true;
    (component as any).incomesLoaded = true;
    const recentInsight: NotificationItem = {
      id: 'n3',
      title: 'Ação imediata: despesas atrasadas',
      message: 'Você tem despesas vencidas em aberto.',
      kind: 'CashflowInsight',
      createdAt: new Date().toISOString(),
      payload: {
        priority: 'critical',
        action: 'Ação recomendada: regularize hoje as despesas vencidas.',
        recommendations: [
          {
            id: 'overdue-expenses',
            severity: 'danger',
            text: 'Você tem 2 despesas vencidas e o caixa não cobre o atraso.',
            actionLabel: 'Quitar despesas',
            route: '/despesas',
            queryParams: { focus: 'overdue' }
          }
        ]
      }
    };

    (component as any).consumeRobotInsight([recentInsight]);

    expect(component.insightPriority).toBe('Crítico');
    expect(component.insightActionSentence).toContain('regularize');
    expect(component.insightTodoItems.length).toBe(1);
    expect(component.insightTodoItems[0].route).toBe('/despesas');
    expect(component.insightTodoItems[0].queryParams['focus']).toBe('overdue');
  });

  it('agenda do dashboard mostra apenas até 7 dias', () => {
    const component = createComponent();
    (component as any).expensesRaw = [
      { id: 'due-7', nome: 'Dentro da janela', categoria: 'Casa', valor: 100, vencimento: localeDateFromToday(7), status: 'OPEN' },
      { id: 'due-8', nome: 'Fora da janela', categoria: 'Casa', valor: 200, vencimento: localeDateFromToday(8), status: 'OPEN' }
    ];

    // A janela deixou de ser aplicada no container e passou a ser regra do
    // `app-upcoming-card`; o container só entrega os lançamentos com data.
    const view = buildUpcomingView(component.upcomingEntries, new Date());

    expect(view.rows.map((row) => row.name)).toEqual(['Dentro da janela']);
  });

  it('conta vencimentos dos próximos 7 dias que caem no mês seguinte', () => {
    // Data fixa de propósito: o bug só aparece quando a janela atravessa o mês,
    // então sem congelar o relógio este teste passaria por acaso no dia 5 e só
    // acusaria no fim do mês. Era assim que ele estava — e foi o que derrubou o
    // quality gate a partir do dia 25.
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 7, 28, 12, 0, 0));
    try {
      const component = createComponent();
      (component as any).expensesLoaded = true;
      (component as any).incomesLoaded = true;
      (component as any).expensesRaw = [
        { id: 'set', nome: 'Vence em setembro', categoria: 'Casa', valor: 300, vencimento: '02/09/2026', status: 'OPEN' },
        { id: 'ago', nome: 'Vence em agosto', categoria: 'Casa', valor: 100, vencimento: '30/08/2026', status: 'OPEN' },
        { id: 'longe', nome: 'Fora da janela', categoria: 'Casa', valor: 900, vencimento: '20/09/2026', status: 'OPEN' }
      ];

      (component as any).updateInsightDiagnostics();

      // 100 + 300: a virada de mês não pode esconder o que vence em 7 dias.
      expect(component.insightDiagnostics.dueSoonExpensesAmount).toBe(400);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('calcula diagnóstico de vencimentos próximos com a mesma janela de 7 dias', () => {
    const component = createComponent();
    (component as any).expensesLoaded = true;
    (component as any).incomesLoaded = true;
    (component as any).expensesRaw = [
      { id: 'due-7', nome: 'Dentro da janela', categoria: 'Casa', valor: 100, vencimento: localeDateFromToday(7), status: 'OPEN' },
      { id: 'due-8', nome: 'Fora da janela', categoria: 'Casa', valor: 200, vencimento: localeDateFromToday(8), status: 'OPEN' }
    ];

    (component as any).updateInsightDiagnostics();

    expect(component.insightDiagnostics.dueSoonExpensesAmount).toBe(100);
    expect(component.insightShortGoal).toContain('próximos 7 dias');
  });

  it('monta evolução do caixa do Controle com 6 meses e exige 2 meses movimentados', () => {
    const component = createComponent();
    component.dataAtual = new Date(2026, 6, 15);
    (component as any).expensesRaw = [
      { id: 'e-jun', nome: 'Junho', categoria: 'Casa', valor: 100, vencimento: '10/06/2026', status: 'OPEN' },
      { id: 'e-jul', nome: 'Julho', categoria: 'Casa', valor: 200, vencimento: '10/07/2026', status: 'OPEN' }
    ];
    (component as any).incomesRaw = [
      { id: 'i-jun', nome: 'Junho', categoria: 'Salário', valor: 500, recebimento: '05/06/2026', status: 'PAID' },
      { id: 'i-jul', nome: 'Julho', categoria: 'Salário', valor: 700, recebimento: '05/07/2026', status: 'PAID' }
    ];

    expect(component.controleFlowSeries.length).toBe(6);
    expect(component.controleFlowSeries.map((point) => point.key)).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07'
    ]);
    // O desenho saiu do componente e foi para o `app-chart-line`; o que o
    // dashboard entrega agora é a série, não caminhos de SVG.
    expect(component.hasEvolutionData).toBeTrue();
    expect(component.evolutionData.months.length).toBe(6);
    expect(component.evolutionData.months.map((m) => m.income)).toEqual([0, 0, 0, 0, 500, 700]);
    expect(component.evolutionData.months.map((m) => m.expense)).toEqual([0, 0, 0, 0, 100, 200]);
    // Controle não vê patrimônio: a série secundária não existe para ele.
    expect(component.evolutionData.months.every((m) => m.netWorth === null)).toBeTrue();
  });

  it('usa estado de histórico começando quando Controle tem só 1 mês movimentado', () => {
    const component = createComponent();
    component.dataAtual = new Date(2026, 6, 15);
    (component as any).expensesRaw = [
      { id: 'e-jul', nome: 'Julho', categoria: 'Casa', valor: 200, vencimento: '10/07/2026', status: 'OPEN' }
    ];

    expect(component.hasEvolutionData).toBeFalse();
  });

  it('resume recorrências do mês a partir de fixas, parcelas e receitas fixas', () => {
    const component = createComponent();
    component.dataAtual = new Date(2026, 6, 15);
    (component as any).expensesRaw = [
      { id: 'sub', nome: 'Streaming', categoria: 'Assinaturas', valor: 50, vencimento: '05/07/2026', status: 'OPEN', fixa: true },
      { id: 'loan', nome: 'Notebook', categoria: 'Eletrônicos', valor: 300, vencimento: '10/07/2026', status: 'OPEN', parcelasTotal: 10, parcelaNumero: 3 },
      { id: 'single', nome: 'Mercado', categoria: 'Alimentação', valor: 120, vencimento: '12/07/2026', status: 'OPEN' },
      { id: 'other-month', nome: 'Agosto', categoria: 'Casa', valor: 80, vencimento: '05/08/2026', status: 'OPEN', fixa: true }
    ];
    (component as any).incomesRaw = [
      { id: 'salary', fonte: 'Salário', categoria: 'Salário', valor: 5000, recebimento: '05/07/2026', status: 'PAID', fixa: true },
      { id: 'freela', fonte: 'Freela', categoria: 'Freela', valor: 900, recebimento: '12/07/2026', status: 'PAID', fixa: false }
    ];

    expect(component.recurrenceItems.map((item) => item.id)).toEqual(['expense-loan', 'expense-sub', 'income-salary']);
    expect(component.recurrenceOutflowTotal).toBe(350);
    expect(component.recurrenceIncomeTotal).toBe(5000);
    expect(component.recurrenceExpenseCount).toBe(2);
    expect(component.recurrenceIncomeCount).toBe(1);
    expect(component.recurrenceItems.map((item) => item.kindLabel)).toEqual(['Parcela 3/10', 'Assinatura', 'Receita fixa']);
  });

  it('resume dívidas e contas para o card do Dashboard', () => {
    const component = createComponent();
    component.debtSummary = buildDebtSummary({
      totalDebt: 1800,
      overdueDebt: 200,
      dueSoonDebt: 450,
      openItemsCount: 4
    });
    component.realBalanceSummary = {
      period: 'month',
      referenceDate: '2026-07-15',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      activeAccountsBalance: 2500,
      pendingExpensesAmount: 600,
      pendingExpensesCount: 3,
      pendingIncomesAmount: 900,
      pendingIncomesCount: 1,
      realAvailableBalance: 1900,
      projectedAvailableBalance: 2800,
      overdueExpensesAmount: 200,
      overdueExpensesCount: 1,
      dueSoonExpensesAmount: 450
    };
    component.accountBalances = [
      { id: 'cash', name: 'Carteira', type: 'Cash', initialBalance: 0, currentBalance: 80, isActive: true, createdAt: '', updatedAt: '', currency: 'BRL' },
      { id: 'main', name: 'Conta principal', type: 'Checking', initialBalance: 0, currentBalance: 2000, isActive: true, createdAt: '', updatedAt: '', currency: 'BRL' },
      { id: 'wallet', name: 'Carteira digital', type: 'DigitalWallet', initialBalance: 0, currentBalance: 420, isActive: true, createdAt: '', updatedAt: '', currency: 'BRL' }
    ];

    expect(component.dashboardAccountsDebtAvailable).toBeTrue();
    expect(component.dashboardAccountsBalance).toBe(2500);
    expect(component.dashboardRealAvailableBalance).toBe(1900);
    expect(component.dashboardDebtTotal).toBe(1800);
    expect(component.dashboardDebtItems.map((item) => item.id)).toEqual(['i-overdue', 'i-card']);
    expect(component.dashboardDebtItems.map((item) => item.tone)).toEqual(['danger', 'warning']);
    expect(component.dashboardTopAccounts.map((account) => account.id)).toEqual(['main', 'wallet', 'cash']);
  });

  it('resume investimentos para o card do Dashboard', () => {
    const component = createComponent();
    component.dataAtual = new Date(2026, 6, 15);
    component.investmentPositions = [
      buildInvestmentPosition({ id: 'rf', type: 'RF', asset: 'Tesouro Selic', quantity: 10, avgPrice: 100, marketPrice: 105 }),
      buildInvestmentPosition({ id: 'acoes', type: 'ACOES', asset: 'PETR4', quantity: 5, avgPrice: 20, marketPrice: 18 })
    ];

    expect(component.hasInvestmentDashboardData).toBeTrue();
    expect(component.investmentsOverview.marketValue).toBe(1140);
    expect(component.investmentsOverview.invested).toBe(1100);
    expect(component.investmentsOverview.growth).toBe(40);
    expect(component.investmentResultTone).toBe('success');
    expect(component.investmentTopDistribution.map((slice) => slice.key)).toEqual(['RF', 'ACOES']);
  });
});

class AccountsServiceMock {
  list = jasmine.createSpy('list').and.returnValue(of([]));
  resolveDefaultAccountId = jasmine.createSpy('resolveDefaultAccountId').and.returnValue(null);
  getRealAvailableBalance = jasmine.createSpy('getRealAvailableBalance').and.returnValue(of(null));
  getDebtSummary = jasmine.createSpy('getDebtSummary').and.returnValue(of(null));
  getNetWorthSummary = jasmine.createSpy('getNetWorthSummary').and.returnValue(of(null));
  getNetWorthHistory = jasmine.createSpy('getNetWorthHistory').and.returnValue(of(null));
  getProjection = jasmine.createSpy('getProjection').and.returnValue(of(null));
  getRiskAssessment = jasmine.createSpy('getRiskAssessment').and.returnValue(of(null));
  getInsights = jasmine.createSpy('getInsights').and.returnValue(of(null));
  getRecommendations = jasmine.createSpy('getRecommendations').and.returnValue(of(null));
  getSubscriptionsSummary = jasmine.createSpy('getSubscriptionsSummary').and.returnValue(of(null));
}

class AuthServiceMock {
  isAuthenticated = jasmine.createSpy('isAuthenticated').and.returnValue(true);
  getRole = jasmine.createSpy('getRole').and.returnValue('Basic');
}

class BudgetServiceMock {
  get = jasmine.createSpy('get').and.returnValue(of(null));
}

class InvestmentsServiceMock {
  listPositions = jasmine.createSpy('listPositions').and.returnValue(of([]));
}

function buildSubscriptionsSummary(overrides: Partial<SubscriptionsSummaryResponse> = {}): SubscriptionsSummaryResponse {
  return {
    referenceDate: '2026-06-01',
    monthlyTotal: 120,
    count: 3,
    items: [],
    ...overrides
  };
}

function buildDebtSummary(overrides: Partial<DebtSummaryResponse> = {}): DebtSummaryResponse {
  return {
    referenceDate: '2026-07-15',
    totalDebt: 0,
    cardDebt: 0,
    otherDebt: 0,
    overdueDebt: 0,
    dueSoonDebt: 0,
    openItemsCount: 0,
    buckets: [],
    nextItems: [
      {
        installmentId: 'i-overdue',
        planId: 'p-overdue',
        family: 'liability',
        title: 'Empréstimo pessoal',
        dueDate: '2026-07-05',
        originalAmount: 200,
        paidAmount: 0,
        openAmount: 200,
        status: 'overdue'
      },
      {
        installmentId: 'i-card',
        planId: 'p-card',
        family: 'card',
        title: 'Fatura Nubank',
        relatedName: 'Nubank',
        dueDate: '2026-07-18',
        originalAmount: 450,
        paidAmount: 0,
        openAmount: 450,
        status: 'open'
      }
    ],
    ...overrides
  };
}

function buildInvestmentPosition(overrides: Partial<InvestmentPosition> = {}): InvestmentPosition {
  return {
    id: 'p1',
    type: 'RF',
    asset: 'Ativo',
    quantity: 1,
    avgPrice: 100,
    openedAt: '2026-01-01',
    account: 'Conta',
    category: '',
    movements: [],
    currency: 'BRL',
    ...overrides
  };
}

function createComponentForSubscriptionTests() {
  const accountsService = new AccountsServiceMock();
  const authService = new AuthServiceMock();
  const budgetService = new BudgetServiceMock();
  const investmentsService = new InvestmentsServiceMock();
  const component = new HomeComponent(
    { expenses$: of([]), incomes$: of([]), cards$: of([]) } as any,
    { list: () => of([]) } as any,
    { debtTotal: () => of({ total: 0 }) } as any,
    { getStatus: () => of({ step: 0, completed: true }), updateStatus: () => of({}) } as any,
    accountsService as any,
    authService as any,
    { getProfile: () => of(null) } as any,
    { list: () => of([]) } as any,
    { health: () => of(null) } as any,
    budgetService as any,
    investmentsService as any,
    { navigateByUrl: jasmine.createSpy() } as any,
    { onDestroy: () => {} } as any
  );
  return { component, accountsService, authService, budgetService, investmentsService };
}

describe('HomeComponent - insights de assinatura', () => {
  it('não carrega o resumo de assinaturas quando o usuário não está logado', () => {
    const { component, accountsService, authService } = createComponentForSubscriptionTests();
    authService.isAuthenticated.and.returnValue(false);

    (component as any).loadSubscriptionsSummary();

    expect(accountsService.getSubscriptionsSummary).not.toHaveBeenCalled();
    expect(component.subscriptionsSummary).toBeNull();
  });

  it('não carrega o resumo de assinaturas para o perfil Basic (recurso é Intermediate+)', () => {
    const { component, accountsService } = createComponentForSubscriptionTests();

    (component as any).loadSubscriptionsSummary();

    expect(accountsService.getSubscriptionsSummary).not.toHaveBeenCalled();
    expect(component.subscriptionsSummary).toBeNull();
  });

  it('preenche o resumo de assinaturas quando a busca tem sucesso', () => {
    const { component, accountsService, authService } = createComponentForSubscriptionTests();
    authService.getRole.and.returnValue('Intermediate');
    accountsService.getSubscriptionsSummary.and.returnValue(of(buildSubscriptionsSummary({ monthlyTotal: 89.7, count: 4 })));

    (component as any).loadSubscriptionsSummary();

    expect(component.subscriptionsSummary?.monthlyTotal).toBe(89.7);
    expect(component.subscriptionsSummary?.count).toBe(4);
  });

  it('zera o resumo de assinaturas quando a busca falha', () => {
    const { component, accountsService, authService } = createComponentForSubscriptionTests();
    authService.getRole.and.returnValue('Intermediate');
    component.subscriptionsSummary = buildSubscriptionsSummary();
    accountsService.getSubscriptionsSummary.and.returnValue(throwError(() => new Error('falhou')));

    (component as any).loadSubscriptionsSummary();

    expect(component.subscriptionsSummary).toBeNull();
  });
});

describe('HomeComponent - orçamento do mês', () => {
  it('não carrega orçamento para perfil Basic', () => {
    const { component, budgetService } = createComponentForSubscriptionTests();

    (component as any).loadBudgetSummary();

    expect(budgetService.get).not.toHaveBeenCalled();
    expect(component.budgetSummary).toBeNull();
  });

  it('preenche orçamento e destaca categorias com maior uso para Controle+', () => {
    const { component, authService, budgetService } = createComponentForSubscriptionTests();
    authService.getRole.and.returnValue('Intermediate');
    component.dataAtual = new Date(2026, 6, 15);
    budgetService.get.and.returnValue(of({
      year: 2026,
      month: 7,
      totalPlanned: 1000,
      totalRealized: 850,
      totalVariance: 150,
      items: [
        { id: 'food', categoryName: 'Alimentação', plannedAmount: 300, realizedAmount: 360, variance: -60 },
        { id: 'home', categoryName: 'Casa', plannedAmount: 500, realizedAmount: 350, variance: 150 },
        { id: 'transport', categoryName: 'Transporte', plannedAmount: 200, realizedAmount: 140, variance: 60 }
      ]
    }));

    (component as any).loadBudgetSummary();

    expect(budgetService.get).toHaveBeenCalledWith(2026, 7);
    expect(component.budgetOverview.usagePercent).toBe(85);
    expect(component.budgetItemHighlights.map((view) => view.item.id)).toEqual(['food', 'home', 'transport']);
  });

  it('zera orçamento quando a busca falha', () => {
    const { component, authService, budgetService } = createComponentForSubscriptionTests();
    authService.getRole.and.returnValue('Intermediate');
    component.budgetSummary = {
      year: 2026,
      month: 7,
      totalPlanned: 100,
      totalRealized: 50,
      totalVariance: 50,
      items: []
    };
    budgetService.get.and.returnValue(throwError(() => new Error('falhou')));

    (component as any).loadBudgetSummary();

    expect(component.budgetSummary).toBeNull();
  });
});

describe('HomeComponent - investimentos no Dashboard', () => {
  it('não carrega posições de investimento para Controle', () => {
    const { component, authService, investmentsService } = createComponentForSubscriptionTests();
    authService.getRole.and.returnValue('Intermediate');

    (component as any).loadInvestmentPositions();

    expect(investmentsService.listPositions).not.toHaveBeenCalled();
    expect(component.investmentPositions).toEqual([]);
  });

  it('carrega posições de investimento para Patrimônio', () => {
    const { component, authService, investmentsService } = createComponentForSubscriptionTests();
    authService.getRole.and.returnValue('Advanced');
    investmentsService.listPositions.and.returnValue(of([
      buildInvestmentPosition({ id: 'rf', quantity: 3, avgPrice: 100, marketPrice: 110 })
    ]));

    (component as any).loadInvestmentPositions();

    expect(investmentsService.listPositions).toHaveBeenCalled();
    expect(component.investmentPositions.length).toBe(1);
    expect(component.investmentsOverview.marketValue).toBe(330);
  });

  it('zera posições e registra falha quando investimentos não carregam', () => {
    const { component, authService, investmentsService } = createComponentForSubscriptionTests();
    authService.getRole.and.returnValue('Advanced');
    component.investmentPositions = [buildInvestmentPosition({ id: 'old' })];
    investmentsService.listPositions.and.returnValue(throwError(() => new Error('falhou')));

    (component as any).loadInvestmentPositions();

    expect(component.investmentPositions).toEqual([]);
    expect(component.loadErrorMessage).toContain('investimentos');
  });
});

class FinancialAssistantServiceMock {
  health = jasmine.createSpy('health').and.returnValue(of(null));
}

function createComponentForAiHealthTests() {
  const accountsService = new AccountsServiceMock();
  const authService = new AuthServiceMock();
  const financialAssistantService = new FinancialAssistantServiceMock();
  const budgetService = new BudgetServiceMock();
  const investmentsService = new InvestmentsServiceMock();
  const component = new HomeComponent(
    { expenses$: of([]), incomes$: of([]), cards$: of([]) } as any,
    { list: () => of([]) } as any,
    { debtTotal: () => of({ total: 0 }) } as any,
    { getStatus: () => of({ step: 0, completed: true }), updateStatus: () => of({}) } as any,
    accountsService as any,
    authService as any,
    { getProfile: () => of(null) } as any,
    { list: () => of([]) } as any,
    financialAssistantService as any,
    budgetService as any,
    investmentsService as any,
    { navigateByUrl: jasmine.createSpy() } as any,
    { onDestroy: () => {} } as any
  );
  return { component, authService, financialAssistantService };
}

describe('HomeComponent - saúde financeira (IA)', () => {
  it('não carrega a saúde financeira quando o usuário não está logado', () => {
    const { component, authService, financialAssistantService } = createComponentForAiHealthTests();
    authService.isAuthenticated.and.returnValue(false);

    (component as any).loadAiHealth();

    expect(financialAssistantService.health).not.toHaveBeenCalled();
    expect(component.aiHealth).toBeNull();
  });

  it('não carrega a saúde financeira para perfil Basic', () => {
    const { component, authService, financialAssistantService } = createComponentForAiHealthTests();
    authService.getRole.and.returnValue('Basic');

    (component as any).loadAiHealth();

    expect(financialAssistantService.health).not.toHaveBeenCalled();
    expect(component.aiHealth).toBeNull();
  });

  it('não carrega a saúde financeira para perfil Intermediate', () => {
    const { component, authService, financialAssistantService } = createComponentForAiHealthTests();
    authService.getRole.and.returnValue('Intermediate');

    (component as any).loadAiHealth();

    expect(financialAssistantService.health).not.toHaveBeenCalled();
    expect(component.aiHealth).toBeNull();
  });

  it('preenche a saúde financeira quando a busca tem sucesso para Advanced+', () => {
    const { component, authService, financialAssistantService } = createComponentForAiHealthTests();
    authService.getRole.and.returnValue('Advanced');
    financialAssistantService.health.and.returnValue(of({
      referenceDate: '2026-06-29',
      overallStatus: 'warning',
      overallSummary: 'Atenção pontual.',
      areas: [{ area: 'cashflow', status: 'ok', explanation: 'ok' }],
      generatedByAi: true
    }));

    (component as any).loadAiHealth();

    expect(component.aiHealth?.overallStatus).toBe('warning');
    expect(component.hasAiHealthAreas).toBeTrue();
  });

  it('mantém saúde financeira válida mesmo sem áreas detalhadas', () => {
    const { component, authService, financialAssistantService } = createComponentForAiHealthTests();
    authService.getRole.and.returnValue('Advanced');
    financialAssistantService.health.and.returnValue(of({
      referenceDate: '2026-06-29',
      overallStatus: 'ok',
      overallSummary: 'Fluxo estável.',
      areas: [],
      generatedByAi: true
    }));

    (component as any).loadAiHealth();

    expect(component.aiHealth?.overallSummary).toBe('Fluxo estável.');
    expect(component.hasAiHealthAreas).toBeFalse();
  });

  it('ignora resposta inválida de saúde financeira para evitar card vazio', () => {
    const { component, authService, financialAssistantService } = createComponentForAiHealthTests();
    authService.getRole.and.returnValue('Advanced');
    financialAssistantService.health.and.returnValue(of([] as any));

    (component as any).loadAiHealth();

    expect(component.aiHealth).toBeNull();
  });

  it('zera a saúde financeira quando a busca falha', () => {
    const { component, authService, financialAssistantService } = createComponentForAiHealthTests();
    authService.getRole.and.returnValue('Advanced');
    financialAssistantService.health.and.returnValue(throwError(() => new Error('falhou')));

    (component as any).loadAiHealth();

    expect(component.aiHealth).toBeNull();
  });

  it('mapeia tom do badge a partir do status', () => {
    const { component } = createComponentForAiHealthTests();

    expect(component.aiHealthTone('critical')).toBe('danger');
    expect(component.aiHealthTone('warning')).toBe('warning');
    expect(component.aiHealthTone('ok')).toBe('success');
  });

  it('mapeia o rótulo de área esperado', () => {
    const { component } = createComponentForAiHealthTests();

    expect(component.aiHealthAreaLabel('cashflow')).toBe('Caixa');
    expect(component.aiHealthAreaLabel('divida')).toBe('Dívida');
    expect(component.aiHealthAreaLabel('patrimonio')).toBe('Patrimônio');
  });
});
