import { of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import { NotificationItem } from './notifications.service';
import { SubscriptionsSummaryResponse } from './accounts.service';

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
    { navigateByUrl: jasmine.createSpy() } as any,
    { onDestroy: () => {} } as any
  );
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

function buildSubscriptionsSummary(overrides: Partial<SubscriptionsSummaryResponse> = {}): SubscriptionsSummaryResponse {
  return {
    referenceDate: '2026-06-01',
    monthlyTotal: 120,
    count: 3,
    items: [],
    ...overrides
  };
}

function createComponentForSubscriptionTests() {
  const accountsService = new AccountsServiceMock();
  const authService = new AuthServiceMock();
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
    { navigateByUrl: jasmine.createSpy() } as any,
    { onDestroy: () => {} } as any
  );
  return { component, accountsService, authService };
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

class FinancialAssistantServiceMock {
  health = jasmine.createSpy('health').and.returnValue(of(null));
}

function createComponentForAiHealthTests() {
  const accountsService = new AccountsServiceMock();
  const authService = new AuthServiceMock();
  const financialAssistantService = new FinancialAssistantServiceMock();
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

  it('preenche a saúde financeira quando a busca tem sucesso para Intermediate+', () => {
    const { component, authService, financialAssistantService } = createComponentForAiHealthTests();
    authService.getRole.and.returnValue('Intermediate');
    financialAssistantService.health.and.returnValue(of({
      referenceDate: '2026-06-29',
      overallStatus: 'warning',
      overallSummary: 'Atenção pontual.',
      areas: [{ area: 'cashflow', status: 'ok', explanation: 'ok' }],
      generatedByAi: true
    }));

    (component as any).loadAiHealth();

    expect(component.aiHealth?.overallStatus).toBe('warning');
  });

  it('zera a saúde financeira quando a busca falha', () => {
    const { component, authService, financialAssistantService } = createComponentForAiHealthTests();
    authService.getRole.and.returnValue('Intermediate');
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
