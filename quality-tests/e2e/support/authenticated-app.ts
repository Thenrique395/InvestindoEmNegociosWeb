import { Page, Route } from '@playwright/test';

type UserRole = 'Basic' | 'Intermediate' | 'Advanced' | 'Admin';

const accountPrimaryId = '11111111-1111-1111-1111-111111111111';
const accountReserveId = '22222222-2222-2222-2222-222222222222';
const cardId = '33333333-3333-3333-3333-333333333333';

type Account = {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AccountTransaction = {
  id: string;
  accountId: string;
  occurredAt: string;
  type: string;
  kind: string;
  amount: number;
  description: string;
  sourceType?: string | null;
  sourceGroup?: string | null;
  sourceLabel?: string | null;
  sourceId?: string | null;
  createdAt: string;
};

type Card = {
  id: string;
  brandId: number;
  holderName: string;
  nickname: string;
  last4: string;
  bank?: string | null;
  creditLimit: number;
  statementCloseDay: number;
  dueDay: number;
  createdAt: string;
  updatedAt: string;
};

type LoanInstallment = {
  id: string;
  installmentNo: number;
  dueDate: string;
  beginningBalance: number;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  endingBalance: number;
  status: string;
  paidAt?: string | null;
};

type LoanContract = {
  id: string;
  title: string;
  principalAmount: number;
  annualInterestRate: number;
  termMonths: number;
  amortizationType: string;
  startDate: string;
  paymentDay: number;
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
  status: string;
  openBalance: number;
  openInstallments: number;
  createdAt: string;
  installments: LoanInstallment[];
};

type InvestmentMovement = {
  id: string;
  type: string;
  quantity: number;
  price: number;
  date: string;
  note?: string;
};

type InvestmentPosition = {
  id: string;
  type: string;
  asset: string;
  quantity: number;
  avgPrice: number;
  openedAt: string;
  account: string;
  category?: string;
  note?: string;
  movements: InvestmentMovement[];
  marketSymbol?: string | null;
  marketPrice?: number | null;
  marketChangePercent?: number | null;
  marketName?: string | null;
  marketLogoUrl?: string | null;
  marketSource?: string | null;
  marketProvider?: string | null;
};

type InvestmentGoal = {
  id: string;
  targetAmount: number;
};

type InvestmentAllocationTarget = {
  rf: number;
  acoes: number;
  fundos: number;
  cripto: number;
  total: number;
};

type MonthlySnapshot = {
  id: string;
  year: number;
  month: number;
  snapshotLabel: string;
  realAvailableBalance: number;
  projectedBalance: number;
  pendingExpenses: number;
  pendingIncomes: number;
  totalDebt: number;
  netWorth: number;
  riskScore: number;
  riskClassification: string;
  primaryInsight: string;
  recommendations: string[];
  createdAt: string;
};

type ApiFailure = {
  path: string | RegExp;
  method?: string;
  requestBodyIncludes?: string;
  status?: number;
  body?: unknown;
};

type SetupAuthenticatedAppOptions = {
  role?: UserRole;
  profileName?: string;
  email?: string;
  notifications?: unknown[];
  onboardingCompleted?: boolean;
  skipSession?: boolean;
  categories?: Category[];
  adminCategories?: AdminCategory[];
  apiFailures?: ApiFailure[];
};

type AdminCardBrand = {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
};

type AdminPaymentMethod = {
  id: number;
  name: string;
  isActive: boolean;
};

type AdminInstitution = {
  id: number;
  name: string;
  type: 'Bank' | 'Broker';
  isActive: boolean;
};

type AdminNotificationSettings = {
  incomeUpcomingEnabled: boolean;
  incomeDaysBefore: number;
  expenseUpcomingEnabled: boolean;
  expenseDaysBefore: number;
  expenseOverdueEnabled: boolean;
  cardCloseSoonEnabled: boolean;
  cardCloseDaysBefore: number;
  cardCloseDayEnabled: boolean;
  monthCloseEnabled: boolean;
  monthSummaryEnabled: boolean;
  goalBelowExpectedEnabled: boolean;
  goalCompletedEnabled: boolean;
  goalInactivityEnabled: boolean;
  goalInactivityDays: number;
};

type AdminRobotSettings = {
  enabled: boolean;
  dailyRunTimeUtc: string;
};

type RobotExecutionMetrics = {
  itemsGenerated: number;
  emailsAttempted: number;
  emailsSent: number;
  emailsFailed: number;
  zeroItemsReasonCode: string | null;
};

type RobotExecutionLog = {
  id: string;
  robotName: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  correlationId: string;
  hostName: string;
  triggeredByUserId: string | null;
  success: boolean;
  processedCount: number;
  metrics: RobotExecutionMetrics;
  wasSkipped: boolean;
  skipReason: string | null;
  error: string | null;
};

type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

type AdminUserFeatureAccess = {
  featureKey: string;
  effectiveEnabled: boolean;
  enabledByRole: boolean;
  overrideEnabled: boolean | null;
};

type Category = {
  id: string;
  name: string;
  appliesTo: 'Income' | 'Expense' | null;
  isDefault: boolean;
  isActive?: boolean;
};

type Plan = {
  id: string;
  userId: string;
  type: 'Income' | 'Expense';
  title: string;
  amount: number;
  schedule: string;
  categoryId?: string | null;
  cardId?: string | null;
  frequency?: string | null;
  installmentsCount?: number | null;
  startDate: string;
  status: string;
};

type AdminCategory = {
  id: string;
  name: string;
  appliesTo: 'Income' | 'Expense' | null;
  isActive: boolean;
  createdAt: string;
};

type BudgetItem = {
  id: string;
  categoryName: string;
  plannedAmount: number;
  realizedAmount: number;
  variance: number;
};

type ScenarioProjectionPoint = {
  date: string;
  baseClosingBalance: number;
  scenarioClosingBalance: number;
};

const initialAccounts: Account[] = [
  {
    id: accountPrimaryId,
    name: 'Conta principal',
    type: 'Checking',
    initialBalance: 2500,
    currentBalance: 3380,
    isActive: true,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-09T10:00:00Z'
  },
  {
    id: accountReserveId,
    name: 'Reserva',
    type: 'Savings',
    initialBalance: 5000,
    currentBalance: 5200,
    isActive: true,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-03-09T10:00:00Z'
  }
];

const initialAccountTransactions: Record<string, AccountTransaction[]> = {
  [accountPrimaryId]: [
    {
      id: 'tx-1',
      accountId: accountPrimaryId,
      occurredAt: '2026-03-06T15:00:00Z',
      type: 'Income',
      kind: 'Credit',
      amount: 950,
      description: 'PIX SALARIO',
      sourceType: 'BankStatementImport',
      sourceGroup: 'import',
      sourceLabel: 'Extrato bancário',
      sourceId: 'source-1',
      createdAt: '2026-03-06T15:00:00Z'
    },
    {
      id: 'tx-2',
      accountId: accountPrimaryId,
      occurredAt: '2026-03-05T12:00:00Z',
      type: 'Expense',
      kind: 'Debit',
      amount: 120.5,
      description: 'Mercado bairro',
      sourceType: 'BankStatementImport',
      sourceGroup: 'import',
      sourceLabel: 'Extrato bancário',
      sourceId: 'source-2',
      createdAt: '2026-03-05T12:00:00Z'
    }
  ],
  [accountReserveId]: []
};

const initialCards: Card[] = [
  {
    id: cardId,
    brandId: 1,
    holderName: 'Henrique Santos',
    nickname: 'Cartao principal',
    last4: '1234',
    bank: 'Banco X',
    creditLimit: 5000,
    statementCloseDay: 10,
    dueDay: 18,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-09T10:00:00Z'
  }
];

const initialLoans: LoanContract[] = [];

const initialInvestmentPositions: InvestmentPosition[] = [
  {
    id: 'pos-1',
    type: 'RF',
    asset: 'Tesouro IPCA+ 2029',
    quantity: 2,
    avgPrice: 600,
    openedAt: '2026-01-15T10:00:00Z',
    account: 'Corretora Alpha',
    category: 'Renda Fixa',
    movements: [
      { id: 'mov-1', type: 'APORTE', quantity: 2, price: 600, date: '2026-01-15' }
    ],
    marketSymbol: null,
    marketPrice: null,
    marketChangePercent: null,
    marketName: null,
    marketLogoUrl: null,
    marketSource: null,
    marketProvider: null
  }
];

const initialInvestmentGoal: InvestmentGoal = { id: 'goal-1', targetAmount: 50000 };

const initialAllocationTarget: InvestmentAllocationTarget = { rf: 60, acoes: 20, fundos: 10, cripto: 5, total: 95 };

const initialSnapshots: MonthlySnapshot[] = [
  {
    id: 'snapshot-1',
    year: 2026,
    month: 3,
    snapshotLabel: '03/2026',
    realAvailableBalance: 6780,
    projectedBalance: 7730,
    pendingExpenses: 1800,
    pendingIncomes: 950,
    totalDebt: 700,
    netWorth: 9080,
    riskScore: 84,
    riskClassification: 'healthy',
    primaryInsight: 'Fluxo sob controle',
    recommendations: ['Separe R$ 300,00 para reforçar a reserva.'],
    createdAt: '2026-03-09T10:00:00Z'
  }
];

const initialAdminCardBrands: AdminCardBrand[] = [
  { id: 1, name: 'Visa', code: 'visa', isActive: true },
  { id: 2, name: 'Mastercard', code: 'mastercard', isActive: true }
];

const initialAdminPaymentMethods: AdminPaymentMethod[] = [
  { id: 1, name: 'PIX', isActive: true },
  { id: 2, name: 'Boleto', isActive: true }
];

const initialAdminInstitutions: AdminInstitution[] = [
  { id: 1, name: 'Banco X', type: 'Bank', isActive: true },
  { id: 2, name: 'Corretora Alpha', type: 'Broker', isActive: true }
];

const initialAdminNotificationSettings: AdminNotificationSettings = {
  incomeUpcomingEnabled: true,
  incomeDaysBefore: 3,
  expenseUpcomingEnabled: true,
  expenseDaysBefore: 3,
  expenseOverdueEnabled: true,
  cardCloseSoonEnabled: true,
  cardCloseDaysBefore: 2,
  cardCloseDayEnabled: true,
  monthCloseEnabled: true,
  monthSummaryEnabled: true,
  goalBelowExpectedEnabled: true,
  goalCompletedEnabled: true,
  goalInactivityEnabled: true,
  goalInactivityDays: 14
};

const initialAdminRobotSettings: AdminRobotSettings = {
  enabled: true,
  dailyRunTimeUtc: '08:00'
};

const initialAdminRobotRuns: RobotExecutionLog[] = [
  {
    id: 'run-1',
    robotName: 'CashflowRiskRobot',
    startedAt: '2026-03-09T08:00:00Z',
    finishedAt: '2026-03-09T08:00:10Z',
    durationMs: 10000,
    correlationId: 'corr-1',
    hostName: 'ci-runner',
    triggeredByUserId: null,
    success: true,
    processedCount: 4,
    metrics: { itemsGenerated: 2, emailsAttempted: 1, emailsSent: 1, emailsFailed: 0, zeroItemsReasonCode: null },
    wasSkipped: false,
    skipReason: null,
    error: null
  }
];

const initialAdminRobots = [
  {
    robotName: 'CashflowRiskRobot',
    lastStartedAt: '2026-03-09T08:00:00Z',
    lastFinishedAt: '2026-03-09T08:00:10Z',
    lastDurationMs: 10000,
    lastSuccess: true,
    lastProcessedCount: 4,
    lastMetrics: { itemsGenerated: 2, emailsAttempted: 1, emailsSent: 1, emailsFailed: 0, zeroItemsReasonCode: null },
    lastCorrelationId: 'corr-1',
    lastHostName: 'ci-runner',
    lastError: null
  },
  {
    robotName: 'NotificationDispatchRobot',
    lastStartedAt: '2026-03-09T08:05:00Z',
    lastFinishedAt: '2026-03-09T08:05:09Z',
    lastDurationMs: 9000,
    lastSuccess: true,
    lastProcessedCount: 3,
    lastMetrics: { itemsGenerated: 0, emailsAttempted: 3, emailsSent: 2, emailsFailed: 1, zeroItemsReasonCode: 'NO_NEW_NOTIFICATIONS' },
    lastCorrelationId: 'corr-2',
    lastHostName: 'ci-runner',
    lastError: null
  }
];

const initialAdminUsers: AdminUserSummary[] = [
  {
    id: 'admin-user-1',
    name: 'Henrique Admin',
    email: 'admin@example.com',
    role: 'Admin',
    isActive: true,
    createdAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'user-basic-1',
    name: 'Maria Basic',
    email: 'maria.basic@example.com',
    role: 'Basic',
    isActive: true,
    createdAt: '2026-02-15T10:00:00Z'
  }
];

const initialAdminUserFeatures: Record<string, AdminUserFeatureAccess[]> = {
  'admin-user-1': [
    { featureKey: 'admin.users.manage', effectiveEnabled: true, enabledByRole: true, overrideEnabled: null },
    { featureKey: 'admin.parameters.manage', effectiveEnabled: true, enabledByRole: true, overrideEnabled: null },
    { featureKey: 'admin.robots.manage', effectiveEnabled: true, enabledByRole: true, overrideEnabled: null }
  ],
  'user-basic-1': [
    { featureKey: 'investments.access', effectiveEnabled: false, enabledByRole: false, overrideEnabled: null },
    { featureKey: 'invoice-import.access', effectiveEnabled: false, enabledByRole: false, overrideEnabled: null },
    { featureKey: 'admin.parameters.manage', effectiveEnabled: false, enabledByRole: false, overrideEnabled: null }
  ]
};

const initialCategories: Category[] = [
  { id: 'cat-default-expense-1', name: 'Mercado', appliesTo: 'Expense', isDefault: true, isActive: true },
  { id: 'cat-default-income-1', name: 'Salário', appliesTo: 'Income', isDefault: true, isActive: true },
  { id: 'cat-user-expense-1', name: 'Lanches', appliesTo: 'Expense', isDefault: false, isActive: true }
];

const initialAdminCategories: AdminCategory[] = [
  {
    id: 'admin-cat-1',
    name: 'Mercado',
    appliesTo: 'Expense',
    isActive: true,
    createdAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'admin-cat-2',
    name: 'Salário',
    appliesTo: 'Income',
    isActive: true,
    createdAt: '2026-02-02T10:00:00Z'
  },
  {
    id: 'admin-cat-3',
    name: 'Assinaturas',
    appliesTo: 'Expense',
    isActive: false,
    createdAt: '2026-02-03T10:00:00Z'
  }
];

const baseCardStatements = [
  {
    statementYear: 2026,
    statementMonth: 3,
    statementCloseDate: '2026-03-10',
    statementDueDate: '2026-03-18',
    totalAmount: 300,
    totalPaid: 120,
    totalOpen: 180,
    itemsCount: 1,
    items: [
      {
        installmentId: 'inst-1',
        planId: 'plan-1',
        title: 'Mercado Fatura',
        installmentNo: 1,
        purchaseDate: '2026-03-05',
        dueDate: '2026-03-18',
        amount: 300,
        paidAmount: 120,
        openAmount: 180,
        status: 'Open'
      }
    ]
  }
];

export async function setupAuthenticatedApp(page: Page, options: SetupAuthenticatedAppOptions = {}): Promise<void> {
  const role = options.role || 'Intermediate';
  const accessToken = buildJwt({
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60
  });
  const state = {
    accounts: structuredClone(initialAccounts),
    accountTransactions: structuredClone(initialAccountTransactions),
    cards: structuredClone(initialCards),
    loans: structuredClone(initialLoans),
    investmentPositions: structuredClone(initialInvestmentPositions),
    investmentGoal: structuredClone(initialInvestmentGoal) as InvestmentGoal | null,
    allocationTarget: structuredClone(initialAllocationTarget),
    snapshots: structuredClone(initialSnapshots),
    cardStatements: structuredClone(baseCardStatements),
    adminCardBrands: structuredClone(initialAdminCardBrands),
    adminPaymentMethods: structuredClone(initialAdminPaymentMethods),
    adminInstitutions: structuredClone(initialAdminInstitutions),
    adminNotificationSettings: structuredClone(initialAdminNotificationSettings),
    adminRobotSettings: structuredClone(initialAdminRobotSettings),
    adminRobotRuns: structuredClone(initialAdminRobotRuns),
    adminRobots: structuredClone(initialAdminRobots),
    adminUsers: structuredClone(initialAdminUsers),
    adminUserFeatures: structuredClone(initialAdminUserFeatures),
    categories: structuredClone(options.categories ?? initialCategories),
    adminCategories: structuredClone(options.adminCategories ?? initialAdminCategories),
    plans: [] as Plan[],
    budgetItems: [] as BudgetItem[],
    role,
    profileName: options.profileName || 'Henrique Santos',
    email: options.email || 'usuario.e2e@example.com',
    notifications: structuredClone(options.notifications || []),
    onboardingCompleted: options.onboardingCompleted ?? true,
    securitySummary: {
      activeSessions: 2,
      failedLoginAttempts: 1,
      isLocked: false,
      lockoutUntil: null,
      lastLoginAt: '2026-03-14T10:00:00Z',
      controls: ['jwt', 'revogação de sessões ativas pelo próprio usuário'],
      recommendations: ['Revogue sessões se notar acesso suspeito']
    },
    preferences: {
      currency: 'BRL',
      locales: ['pt-BR'],
      notifications: {
        upcomingEnabled: true,
        overdueEnabled: true,
        inAppEnabled: true,
        emailEnabled: false,
        daysBeforeDue: 3
      }
    },
    privacySummary: {
      activeSessions: 2,
      pendingPasswordResetRequests: 1,
      auditEntries: 12,
      dataExportEnabled: true,
      selfServiceDeletionEnabled: true,
      deletionScope: ['perfil', 'dados financeiros', 'tokens de sessão, reset de senha e trilha de auditoria'],
      productionControls: ['segregação por userId', 'exportação em JSON', 'revogação de sessões'],
      scalabilityPhase: 'Fase 2',
      retentionPolicy: 'Dados são removidos permanentemente após confirmação do usuário.'
    },
    assistantContext: {
      referenceDate: '2026-03-14',
      realBalance: {
        period: 'month',
        referenceDate: '2026-03-14',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        activeAccountsBalance: 8580,
        pendingExpensesAmount: 1800,
        pendingExpensesCount: 3,
        pendingIncomesAmount: 950,
        pendingIncomesCount: 1,
        realAvailableBalance: 6780,
        projectedAvailableBalance: 7730,
        overdueExpensesAmount: 0,
        overdueExpensesCount: 0,
        dueSoonExpensesAmount: 600
      },
      debts: {
        referenceDate: '2026-03-14',
        totalDebt: 700,
        cardDebt: 300,
        otherDebt: 400,
        overdueDebt: 0,
        dueSoonDebt: 300,
        openItemsCount: 2,
        buckets: [],
        nextItems: []
      },
      netWorth: {
        referenceDate: '2026-03-14',
        assets: { accountsBalance: 8580, investmentsBalance: 1200, tangibleAssetsBalance: 0, totalAssets: 9780 },
        liabilities: { cardDebt: 300, otherOpenLiabilities: 400, totalLiabilities: 700 },
        netWorth: 9080,
        investmentPositionsCount: 1,
        openLiabilitiesCount: 2,
        snapshotLabel: '03/2026'
      },
      projection: {
        period: 'month',
        referenceDate: '2026-03-14',
        projectionStart: '2026-03-14',
        projectionEnd: '2026-03-31',
        openingBalance: 6780,
        projectedClosingBalance: 7730,
        lowestBalance: 6400,
        lowestBalanceDate: '2026-03-18',
        riskDate: null,
        points: []
      },
      risk: {
        period: 'month',
        referenceDate: '2026-03-14',
        score: 84,
        classification: 'healthy',
        priority: 'warning',
        riskDate: null,
        currentCoverage: 78,
        projectedCoverage: 88,
        projectedBalance: 7730,
        reasonCodes: ['healthy_projection'],
        scoreBreakdown: ['Fluxo positivo'],
        recommendations: []
      },
      insights: {
        period: 'month',
        referenceDate: '2026-03-14',
        primaryInsight: {
          family: 'preventive',
          scenario: 'stable',
          priority: 'ok',
          title: 'Fluxo sob controle',
          message: 'Seu caixa cobre as obrigações do mês.',
          action: 'Mantenha aportes',
          healthScore: 84,
          riskDate: null,
          currentCoverage: 78,
          projectedCoverage: 88,
          projectedBalance: 7730,
          highlights: ['Cartões sem atraso'],
          tips: ['Reforce a reserva'],
          reasonCodes: ['healthy_projection'],
          scoreBreakdown: ['Fluxo positivo'],
          recommendations: []
        },
        insights: []
      },
      recommendations: {
        period: 'month',
        referenceDate: '2026-03-14',
        minScoreApplied: 50,
        items: [
          {
            id: 'assistant-rec-1',
            score: 78,
            severity: 'warn',
            source: 'risk',
            title: 'Reforce a reserva',
            text: 'Separe R$ 300,00 para a reserva.',
            actionLabel: 'Ver contas',
            route: '/contas',
            queryParams: {},
            reasonCodes: [],
            amount: 300,
            dueDate: null
          }
        ]
      },
      governanceSummary: 'Assistente apenas resume dados já calculados e não executa ações automáticas.'
    },
    subscriptionCatalog: {
      current: {
        planCode: 'basic',
        planName: 'Basic',
        role: role,
        status: 'Active',
        billingCycle: 'Monthly',
        priceAmount: 0,
        currency: 'BRL',
        autoRenew: false,
        startedAt: '2026-03-01T10:00:00Z',
        renewsAt: null,
        cancelledAt: null
      },
      plans: [
        {
          code: 'basic',
          name: 'Basic',
          role: 'Basic',
          description: 'Plano inicial',
          monthlyPrice: 0,
          yearlyPrice: 0,
          recommended: false,
          current: true,
          features: ['Dashboard', 'Calendário', 'Calculadora', 'Contas', 'Cartões'],
          limits: { contas: '1 conta extra' }
        },
        {
          code: 'intermediate',
          name: 'Intermediate',
          role: 'Intermediate',
          description: 'Plano intermediário',
          monthlyPrice: 29.9,
          yearlyPrice: 299,
          recommended: true,
          current: false,
          features: ['Importação de fatura'],
          limits: { categorias: 'Ilimitadas' }
        }
      ],
      notes: ['Mudança de plano atualiza a sessão imediatamente.']
    },
    apiFailures: options.apiFailures || []
  };

  if (!options.skipSession) {
    // O JWT em si vive só no cookie httpOnly (não lido pelo app); aqui só precisamos dos
    // metadados não-sensíveis que `AuthService` guarda em localStorage para isAuthenticated()/getRole().
    await page.addInitScript(({ token, profileName, email }) => {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      window.localStorage.setItem('user_role', payload.role);
      window.localStorage.setItem('user_name', profileName);
      window.localStorage.setItem('user_email', email);
      window.localStorage.setItem('access_expires_at', new Date(Date.now() + 60 * 60 * 1000).toISOString());
    }, { token: accessToken, profileName: state.profileName, email: state.email });
  }

  await page.route('**/api/v1/**', async (route) => fulfillApi(route, state));
}

async function fulfillApi(route: Route, state: {
  accounts: Account[];
  accountTransactions: Record<string, AccountTransaction[]>;
  cards: Card[];
  loans: LoanContract[];
  investmentPositions: InvestmentPosition[];
  investmentGoal: InvestmentGoal | null;
  allocationTarget: InvestmentAllocationTarget;
  snapshots: MonthlySnapshot[];
  cardStatements: typeof baseCardStatements;
  adminCardBrands: AdminCardBrand[];
  adminPaymentMethods: AdminPaymentMethod[];
  adminInstitutions: AdminInstitution[];
  adminNotificationSettings: AdminNotificationSettings;
  adminRobotSettings: AdminRobotSettings;
  adminRobotRuns: RobotExecutionLog[];
  adminRobots: Array<{
    robotName: string;
    lastStartedAt: string | null;
    lastFinishedAt: string | null;
    lastDurationMs: number;
    lastSuccess: boolean | null;
    lastProcessedCount: number;
    lastMetrics: RobotExecutionMetrics;
    lastCorrelationId: string | null;
    lastHostName: string | null;
    lastError: string | null;
  }>;
  adminUsers: AdminUserSummary[];
  adminUserFeatures: Record<string, AdminUserFeatureAccess[]>;
  categories: Category[];
  adminCategories: AdminCategory[];
  plans: Plan[];
  budgetItems: BudgetItem[];
  role: UserRole;
  profileName: string;
  email: string;
  notifications: unknown[];
  onboardingCompleted: boolean;
  securitySummary: {
    activeSessions: number;
    failedLoginAttempts: number;
    isLocked: boolean;
    lockoutUntil: string | null;
    lastLoginAt: string | null;
    controls: string[];
    recommendations: string[];
  };
  preferences: {
    currency: string;
    locales: string[];
    notifications: {
      upcomingEnabled: boolean;
      overdueEnabled: boolean;
      inAppEnabled: boolean;
      emailEnabled: boolean;
      daysBeforeDue: number;
    };
  };
  privacySummary: {
    activeSessions: number;
    pendingPasswordResetRequests: number;
    auditEntries: number;
    dataExportEnabled: boolean;
    selfServiceDeletionEnabled: boolean;
    deletionScope: string[];
    productionControls: string[];
    scalabilityPhase: string;
    retentionPolicy: string;
  };
  assistantContext: any;
  subscriptionCatalog: {
    current: {
      planCode: string;
      planName: string;
      role: string;
      status: string;
      billingCycle: string;
      priceAmount: number;
      currency: string;
      autoRenew: boolean;
      startedAt: string;
      renewsAt: string | null;
      cancelledAt: string | null;
    };
    plans: Array<{
      code: string;
      name: string;
      role: string;
      description: string;
      monthlyPrice: number;
      yearlyPrice: number;
      recommended: boolean;
      current: boolean;
      features: string[];
      limits: Record<string, string>;
    }>;
    notes: string[];
  };
  apiFailures: ApiFailure[];
}): Promise<void> {
  const url = new URL(route.request().url());
  const path = url.pathname.replace(/\/+$/, '');
  const method = route.request().method().toUpperCase();

  const apiFailure = state.apiFailures.find((failure) => {
    const matchesMethod = !failure.method || failure.method.toUpperCase() === method;
    const matchesPath = typeof failure.path === 'string' ? failure.path === path : failure.path.test(path);
    const matchesBody = !failure.requestBodyIncludes || (route.request().postData() || '').includes(failure.requestBodyIncludes);
    return matchesMethod && matchesPath && matchesBody;
  });
  if (apiFailure) {
    await json(route, apiFailure.body ?? { detail: 'Falha simulada.' }, apiFailure.status ?? 500);
    return;
  }

  if (method === 'POST' && path === '/api/v1/auth/login') {
    const token = buildJwt({
      role: state.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    });
    await json(route, {
      userId: '44444444-4444-4444-4444-444444444444',
      name: state.profileName,
      email: state.email,
      role: state.role,
      token,
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    });
    return;
  }

  if (method === 'POST' && path === '/api/v1/auth/register') {
    const payload = JSON.parse(route.request().postData() || '{}');
    state.profileName = payload.name || state.profileName;
    state.email = payload.email || state.email;
    const token = buildJwt({
      role: state.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    });
    await json(route, {
      userId: '44444444-4444-4444-4444-444444444444',
      name: state.profileName,
      email: state.email,
      role: state.role,
      token,
      refreshToken: 'refresh-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }, 201);
    return;
  }

  if (method === 'PUT' && path === '/api/v1/onboarding') {
    const payload = JSON.parse(route.request().postData() || '{}');
    state.onboardingCompleted = payload.completed === true;
    await json(route, {
      step: Number(payload.step ?? (state.onboardingCompleted ? 3 : 0)),
      completed: state.onboardingCompleted,
      completedAt: state.onboardingCompleted ? new Date().toISOString() : null
    });
    return;
  }

  if (method === 'POST' && path === '/api/v1/plans') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const created: Plan = {
      id: crypto.randomUUID(),
      userId: '44444444-4444-4444-4444-444444444444',
      type: payload.type,
      title: payload.title,
      amount: Number(payload.amount || 0),
      schedule: payload.schedule,
      categoryId: payload.categoryId ?? null,
      cardId: payload.cardId ?? null,
      frequency: payload.frequency ?? null,
      installmentsCount: payload.installmentsCount ?? null,
      startDate: payload.startDate,
      status: 'Active'
    };
    state.plans.push(created);
    await json(route, created, 201);
    return;
  }

  if (method === 'POST' && path === '/api/v1/accounts') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const createdAt = new Date().toISOString();
    const created = {
      id: crypto.randomUUID(),
      name: payload.name,
      type: payload.type,
      initialBalance: Number(payload.initialBalance || 0),
      currentBalance: Number(payload.initialBalance || 0),
      isActive: payload.isActive !== false,
      createdAt,
      updatedAt: createdAt
    };
    state.accounts.unshift(created);
    state.accountTransactions[created.id] = [];
    await json(route, created, 201);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/accounts\/[^/]+$/)) {
    const accountId = path.split('/')[4];
    const payload = JSON.parse(route.request().postData() || '{}');
    const existing = state.accounts.find((item) => item.id === accountId);
    if (!existing) {
      await json(route, { detail: 'Conta não encontrada.' }, 404);
      return;
    }

    existing.name = payload.name ?? existing.name;
    existing.type = payload.type ?? existing.type;
    existing.isActive = payload.isActive ?? existing.isActive;
    existing.initialBalance = Number(payload.initialBalance ?? existing.initialBalance);
    existing.currentBalance = Number(payload.initialBalance ?? existing.currentBalance);
    existing.updatedAt = new Date().toISOString();

    await json(route, existing);
    return;
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/accounts\/[^/]+$/)) {
    const accountId = path.split('/')[4];
    state.accounts = state.accounts.filter((item) => item.id !== accountId);
    delete state.accountTransactions[accountId];
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (method === 'POST' && path === '/api/v1/accounts/transfers') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const fromAccount = state.accounts.find((item) => item.id === payload.fromAccountId);
    const toAccount = state.accounts.find((item) => item.id === payload.toAccountId);
    if (!fromAccount || !toAccount) {
      await json(route, { detail: 'Conta de origem ou destino não encontrada.' }, 404);
      return;
    }

    const amount = Number(payload.amount || 0);
    const occurredAt = payload.occurredAt || new Date().toISOString();
    const description = payload.description || 'Transferência entre contas';
    const transferId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const debit = {
      id: crypto.randomUUID(),
      accountId: fromAccount.id,
      occurredAt,
      type: 'Transfer',
      kind: 'Debit',
      amount,
      description,
      sourceType: 'Transfer',
      sourceGroup: 'transfer',
      sourceLabel: 'Transferência',
      sourceId: transferId,
      createdAt
    };

    const credit = {
      id: crypto.randomUUID(),
      accountId: toAccount.id,
      occurredAt,
      type: 'Transfer',
      kind: 'Credit',
      amount,
      description,
      sourceType: 'Transfer',
      sourceGroup: 'transfer',
      sourceLabel: 'Transferência',
      sourceId: transferId,
      createdAt
    };

    state.accountTransactions[fromAccount.id] = [debit, ...(state.accountTransactions[fromAccount.id] || [])];
    state.accountTransactions[toAccount.id] = [credit, ...(state.accountTransactions[toAccount.id] || [])];
    fromAccount.currentBalance -= amount;
    toAccount.currentBalance += amount;
    fromAccount.updatedAt = createdAt;
    toAccount.updatedAt = createdAt;

    await json(route, {
      transferId,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      amount,
      occurredAtUtc: occurredAt,
      description
    });
    return;
  }

  if (method === 'POST' && path === '/api/v1/cards') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const createdAt = new Date().toISOString();
    const created = {
      id: crypto.randomUUID(),
      brandId: Number(payload.brandId || 1),
      holderName: payload.holderName,
      nickname: payload.nickname || payload.holderName,
      last4: payload.last4,
      bank: payload.bank || null,
      creditLimit: Number(payload.creditLimit || 0),
      statementCloseDay: Number(payload.statementCloseDay || 1),
      dueDay: Number(payload.dueDay || 1),
      createdAt,
      updatedAt: createdAt
    };
    state.cards.unshift(created);
    await json(route, created, 201);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/cards\/[^/]+$/)) {
    const cardIdToUpdate = path.split('/')[4];
    const payload = JSON.parse(route.request().postData() || '{}');
    const existing = state.cards.find((item) => item.id === cardIdToUpdate);
    if (!existing) {
      await json(route, { detail: 'Cartão não encontrado.' }, 404);
      return;
    }

    existing.brandId = Number(payload.brandId ?? existing.brandId);
    existing.holderName = payload.holderName ?? existing.holderName;
    existing.nickname = payload.nickname ?? payload.holderName ?? existing.nickname;
    existing.last4 = payload.last4 ?? existing.last4;
    existing.bank = payload.bank ?? existing.bank;
    existing.creditLimit = Number(payload.creditLimit ?? existing.creditLimit);
    existing.statementCloseDay = Number(payload.statementCloseDay ?? existing.statementCloseDay);
    existing.dueDay = Number(payload.dueDay ?? existing.dueDay);
    existing.updatedAt = new Date().toISOString();

    await json(route, existing);
    return;
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/cards\/[^/]+$/)) {
    const cardIdToDelete = path.split('/')[4];
    state.cards = state.cards.filter((item) => item.id !== cardIdToDelete);
    state.cardStatements = state.cards.length ? state.cardStatements : [];
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (method === 'POST' && path === '/api/v1/accounts/ofx/extract') {
    await json(route, {
      bankId: '341',
      branchId: '0001',
      accountNumber: '123456',
      accountType: 'CHECKING',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      ledgerBalance: 4209.5,
      items: [
        {
          postedAt: '2026-03-06T15:00:00Z',
          amount: 950,
          kind: 'Credit',
          description: 'PIX SALARIO',
          memo: 'CREDITO EMPRESA',
          externalId: 'ofx-001',
          type: 'CREDIT',
          isDuplicate: false
        },
        {
          postedAt: '2026-03-05T12:00:00Z',
          amount: 120.5,
          kind: 'Debit',
          description: 'Mercado bairro',
          memo: 'COMPRA NO CARTAO',
          externalId: 'ofx-002',
          type: 'DEBIT',
          isDuplicate: false
        }
      ],
      rawText: 'OFX SAMPLE'
    });
    return;
  }

  if (method === 'POST' && path === '/api/v1/accounts/ofx/import') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const account = state.accounts.find((item) => item.id === payload.accountId);
    const items = Array.isArray(payload.items) ? payload.items : [];
    let created = 0;
    let skipped = 0;

    for (const item of items) {
      const exists = (state.accountTransactions[payload.accountId] || []).some(
        (tx) => tx.description === item.description && tx.amount === item.amount && tx.kind === item.kind
      );
      if (payload.skipDuplicates && exists) {
        skipped++;
        continue;
      }

      const tx = {
        id: crypto.randomUUID(),
        accountId: payload.accountId,
        occurredAt: item.postedAt,
        type: item.kind === 'Credit' ? 'Income' : 'Expense',
        kind: item.kind,
        amount: Number(item.amount),
        description: item.description,
        sourceType: 'BankStatementImport',
        sourceGroup: 'import',
        sourceLabel: 'Extrato bancário',
        sourceId: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      state.accountTransactions[payload.accountId] = [tx, ...(state.accountTransactions[payload.accountId] || [])];
      if (account) {
        account.currentBalance += tx.kind === 'Credit' ? tx.amount : -tx.amount;
        account.updatedAt = new Date().toISOString();
      }
      created++;
    }

    await json(route, { created, skipped });
    return;
  }

  if (method === 'POST' && path === '/api/v1/accounts/csv/extract') {
    await json(route, {
      delimiter: ';',
      detectedColumns: ['data', 'descricao', 'valor', 'tipo'],
      items: [
        {
          postedAt: '2026-03-07T08:30:00Z',
          amount: 45.9,
          kind: 'Debit',
          description: 'Padaria central',
          memo: 'DEBITO',
          externalId: 'csv-001',
          type: 'DEBIT',
          isDuplicate: false
        },
        {
          postedAt: '2026-03-07T18:00:00Z',
          amount: 1200,
          kind: 'Credit',
          description: 'Freelance cliente',
          memo: 'PIX',
          externalId: 'csv-002',
          type: 'CREDIT',
          isDuplicate: false
        }
      ],
      rawText: 'data;descricao;valor;tipo'
    });
    return;
  }

  if (method === 'POST' && path === '/api/v1/accounts/csv/import') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const account = state.accounts.find((item) => item.id === payload.accountId);
    const items = Array.isArray(payload.items) ? payload.items : [];
    let created = 0;
    let skipped = 0;

    for (const item of items) {
      const exists = (state.accountTransactions[payload.accountId] || []).some(
        (tx) => tx.description === item.description && tx.amount === item.amount && tx.kind === item.kind
      );
      if (payload.skipDuplicates && exists) {
        skipped++;
        continue;
      }

      const tx = {
        id: crypto.randomUUID(),
        accountId: payload.accountId,
        occurredAt: item.postedAt,
        type: item.kind === 'Credit' ? 'Income' : 'Expense',
        kind: item.kind,
        amount: Number(item.amount),
        description: item.description,
        sourceType: 'BankStatementImport',
        sourceGroup: 'import',
        sourceLabel: 'Extrato bancário',
        sourceId: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      state.accountTransactions[payload.accountId] = [tx, ...(state.accountTransactions[payload.accountId] || [])];
      if (account) {
        account.currentBalance += tx.kind === 'Credit' ? tx.amount : -tx.amount;
        account.updatedAt = new Date().toISOString();
      }
      created++;
    }

    await json(route, { created, skipped });
    return;
  }

  if (method === 'POST' && path === '/api/v1/loans/simulate') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const principal = Number(payload.principalAmount || 0);
    const termMonths = Number(payload.termMonths || 1);
    const annualRate = Number(payload.annualInterestRate || 0);
    const monthlyRate = annualRate / 12 / 100;
    const monthlyPayment = Number((principal * (monthlyRate || 1 / Math.max(termMonths, 1))).toFixed(2));
    await json(route, {
      monthlyPayment,
      totalCost: Number((monthlyPayment * termMonths).toFixed(2)),
      totalInterest: Number((monthlyPayment * termMonths - principal).toFixed(2)),
      amortizationType: payload.amortizationType,
      installments: [
        {
          id: 'loan-sim-1',
          installmentNo: 1,
          dueDate: payload.startDate,
          beginningBalance: principal,
          principalAmount: Number((monthlyPayment * 0.8).toFixed(2)),
          interestAmount: Number((monthlyPayment * 0.2).toFixed(2)),
          totalAmount: monthlyPayment,
          endingBalance: Number((principal - monthlyPayment * 0.8).toFixed(2)),
          status: 'Open',
          paidAt: null
        }
      ]
    });
    return;
  }

  if (method === 'POST' && path === '/api/v1/loans') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const createdAt = new Date().toISOString();
    const contractId = crypto.randomUUID();
    const termMonths = Number(payload.termMonths || 3);
    const principal = Number(payload.principalAmount || 12000);
    const monthlyPayment = 550;
    const numInstallments = Math.min(termMonths, 3);
    const installments: LoanInstallment[] = Array.from({ length: numInstallments }, (_, i) => {
      const due = new Date();
      due.setMonth(due.getMonth() + i + 1);
      return {
        id: `${contractId}-inst-${i + 1}`,
        installmentNo: i + 1,
        dueDate: due.toISOString().split('T')[0],
        beginningBalance: principal - i * (principal / numInstallments),
        principalAmount: Number((principal / numInstallments * 0.8).toFixed(2)),
        interestAmount: Number((monthlyPayment * 0.2).toFixed(2)),
        totalAmount: monthlyPayment,
        endingBalance: Number((principal - (i + 1) * (principal / numInstallments)).toFixed(2)),
        status: 'Open',
        paidAt: null
      };
    });
    const created = {
      id: contractId,
      title: payload.title,
      principalAmount: principal,
      annualInterestRate: Number(payload.annualInterestRate || 0),
      termMonths,
      amortizationType: payload.amortizationType || 'Price',
      startDate: payload.startDate,
      paymentDay: Number(payload.paymentDay || 10),
      monthlyPayment,
      totalCost: monthlyPayment * termMonths,
      totalInterest: monthlyPayment * termMonths - principal,
      status: 'Active',
      openBalance: principal,
      openInstallments: numInstallments,
      createdAt,
      installments
    };
    state.loans.unshift(created);
    await json(route, created, 201);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/loans\/[^/]+$/)) {
    const loanId = path.split('/')[4];
    const payload = JSON.parse(route.request().postData() || '{}');
    const loan = state.loans.find((item) => item.id === loanId);
    if (!loan) {
      await json(route, { title: 'Contrato não encontrado', detail: 'O contrato informado não existe ou não pertence ao usuário.' }, 404);
      return;
    }
    loan.title = payload.title ?? loan.title;
    loan.principalAmount = Number(payload.principalAmount ?? loan.principalAmount);
    loan.annualInterestRate = Number(payload.annualInterestRate ?? loan.annualInterestRate);
    loan.termMonths = Number(payload.termMonths ?? loan.termMonths);
    loan.amortizationType = payload.amortizationType ?? loan.amortizationType;
    loan.startDate = payload.startDate ?? loan.startDate;
    loan.paymentDay = Number(payload.paymentDay ?? loan.paymentDay);
    await json(route, loan);
    return;
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/loans\/[^/]+$/)) {
    const loanId = path.split('/')[4];
    const idx = state.loans.findIndex((item) => item.id === loanId);
    if (idx === -1) {
      await json(route, { title: 'Contrato não encontrado', detail: 'O contrato informado não existe ou não pertence ao usuário.' }, 404);
      return;
    }
    state.loans.splice(idx, 1);
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (path === '/api/v1/investments/positions' && method !== 'POST') {
    await json(route, state.investmentPositions);
    return;
  }

  if (method === 'POST' && path === '/api/v1/investments/positions') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const created: InvestmentPosition = {
      id: crypto.randomUUID(),
      type: payload.type,
      asset: payload.asset,
      quantity: Number(payload.quantity || 0),
      avgPrice: Number(payload.avgPrice || 0),
      openedAt: payload.openedAt || new Date().toISOString(),
      account: payload.account,
      category: payload.category || undefined,
      note: payload.note || undefined,
      movements: [],
      marketSymbol: null,
      marketPrice: null,
      marketChangePercent: null,
      marketName: null,
      marketLogoUrl: null,
      marketSource: null,
      marketProvider: null
    };
    state.investmentPositions.push(created);
    await json(route, created, 201);
    return;
  }

  if (method === 'POST' && path.match(/^\/api\/v1\/investments\/positions\/[^/]+\/movements$/)) {
    const posId = path.split('/')[5];
    const payload = JSON.parse(route.request().postData() || '{}');
    const pos = state.investmentPositions.find((item) => item.id === posId);
    if (!pos) {
      await json(route, { detail: 'Posição não encontrada.' }, 404);
      return;
    }
    const movement: InvestmentMovement = {
      id: crypto.randomUUID(),
      type: payload.type,
      quantity: Number(payload.quantity || 0),
      price: Number(payload.price || 0),
      date: payload.date || new Date().toISOString().slice(0, 10),
      note: payload.note || undefined
    };
    pos.movements.push(movement);
    await json(route, movement, 201);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/investments\/positions\/[^/]+$/) && !path.includes('/movements')) {
    const posId = path.split('/')[5];
    const payload = JSON.parse(route.request().postData() || '{}');
    const pos = state.investmentPositions.find((item) => item.id === posId);
    if (!pos) {
      await json(route, { detail: 'Posição não encontrada.' }, 404);
      return;
    }
    pos.type = payload.type ?? pos.type;
    pos.asset = payload.asset ?? pos.asset;
    pos.quantity = Number(payload.quantity ?? pos.quantity);
    pos.avgPrice = Number(payload.avgPrice ?? pos.avgPrice);
    pos.openedAt = payload.openedAt ?? pos.openedAt;
    pos.account = payload.account ?? pos.account;
    pos.category = payload.category ?? pos.category;
    pos.note = payload.note ?? pos.note;
    await json(route, pos);
    return;
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/investments\/positions\/[^/]+$/)) {
    const posId = path.split('/')[5];
    const idx = state.investmentPositions.findIndex((item) => item.id === posId);
    if (idx === -1) {
      await json(route, { detail: 'Posição não encontrada.' }, 404);
      return;
    }
    state.investmentPositions.splice(idx, 1);
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (path === '/api/v1/investments/goal') {
    if (method === 'PUT') {
      const payload = JSON.parse(route.request().postData() || '{}');
      if (!state.investmentGoal) {
        state.investmentGoal = { id: crypto.randomUUID(), targetAmount: Number(payload.targetAmount || 0) };
      } else {
        state.investmentGoal.targetAmount = Number(payload.targetAmount ?? state.investmentGoal.targetAmount);
      }
      await json(route, state.investmentGoal);
    } else {
      await json(route, state.investmentGoal);
    }
    return;
  }

  if (path === '/api/v1/investments/allocation-target') {
    if (method === 'PUT') {
      const payload = JSON.parse(route.request().postData() || '{}');
      state.allocationTarget.rf = Number(payload.rf ?? state.allocationTarget.rf);
      state.allocationTarget.acoes = Number(payload.acoes ?? state.allocationTarget.acoes);
      state.allocationTarget.fundos = Number(payload.fundos ?? state.allocationTarget.fundos);
      state.allocationTarget.cripto = Number(payload.cripto ?? state.allocationTarget.cripto);
      state.allocationTarget.total = state.allocationTarget.rf + state.allocationTarget.acoes + state.allocationTarget.fundos + state.allocationTarget.cripto;
      await json(route, state.allocationTarget);
    } else {
      await json(route, state.allocationTarget);
    }
    return;
  }

  if (method === 'POST' && path === '/api/v1/subscriptions/retry-payment') {
    if (state.subscriptionCatalog.current.status !== 'PastDue') {
      await json(route, { detail: 'Só é possível tentar novamente quando há pagamento em atraso.' }, 400);
      return;
    }
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (method === 'POST' && path === '/api/v1/monthlysnapshots/generate') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const month = Number(payload.month || 1);
    const year = Number(payload.year || 2026);
    const created = {
      id: crypto.randomUUID(),
      year,
      month,
      snapshotLabel: `${String(month).padStart(2, '0')}/${year}`,
      realAvailableBalance: 6900,
      projectedBalance: 7800,
      pendingExpenses: 1600,
      pendingIncomes: 1000,
      totalDebt: 700,
      netWorth: 9200,
      riskScore: 86,
      riskClassification: 'healthy',
      primaryInsight: 'Snapshot gerado com sucesso',
      recommendations: ['Reforce a reserva'],
      createdAt: new Date().toISOString()
    };
    state.snapshots = [created, ...state.snapshots.filter((item) => item.id !== created.id)];
    await json(route, created);
    return;
  }

  if (method === 'POST' && path === '/api/v1/subscriptions/change') {
    const payload = JSON.parse(route.request().postData() || '{}');
    state.subscriptionCatalog.current = {
      planCode: payload.planCode,
      planName: payload.planCode === 'intermediate' ? 'Intermediate' : payload.planCode,
      role: payload.planCode === 'intermediate' ? 'Intermediate' : 'Basic',
      status: 'Active',
      billingCycle: payload.billingCycle,
      priceAmount: payload.billingCycle === 'Yearly' ? 299 : 29.9,
      currency: 'BRL',
      autoRenew: true,
      startedAt: new Date().toISOString(),
      renewsAt: '2027-03-01T10:00:00Z',
      cancelledAt: null
    };
    state.subscriptionCatalog.plans = state.subscriptionCatalog.plans.map((plan) => ({
      ...plan,
      current: plan.code === payload.planCode
    }));
    await json(route, {
      current: state.subscriptionCatalog.current,
      session: {
        userId: '44444444-4444-4444-4444-444444444444',
        name: state.profileName,
        email: 'mock@example.com',
        role: state.subscriptionCatalog.current.role,
        token: 'jwt',
        refreshToken: 'refresh',
        expiresAt: '2026-03-14T11:00:00Z'
      },
      notes: state.subscriptionCatalog.notes
    });
    return;
  }

  if (method === 'POST' && path === '/api/v1/subscriptions/cancel') {
    state.subscriptionCatalog.current = {
      ...state.subscriptionCatalog.current,
      status: 'Cancelled',
      autoRenew: false,
      role: 'Basic',
      cancelledAt: new Date().toISOString()
    };
    await json(route, {
      current: state.subscriptionCatalog.current,
      session: {
        userId: '44444444-4444-4444-4444-444444444444',
        name: state.profileName,
        email: 'mock@example.com',
        role: 'Basic',
        token: 'jwt-basic',
        refreshToken: 'refresh-basic',
        expiresAt: '2026-03-14T11:00:00Z'
      },
      notes: state.subscriptionCatalog.notes
    });
    return;
  }

  if (method === 'POST' && path === '/api/v1/preferences/sessions/revoke') {
    const revoked = state.securitySummary.activeSessions;
    state.securitySummary.activeSessions = 0;
    await json(route, { revokedSessions: revoked, revokedAtUtc: new Date().toISOString() });
    return;
  }

  if (method === 'PUT' && path === '/api/v1/preferences') {
    const payload = JSON.parse(route.request().postData() || '{}');
    state.preferences = {
      currency: payload.currency ?? state.preferences.currency,
      locales: Array.isArray(payload.locales) && payload.locales.length ? payload.locales : state.preferences.locales,
      notifications: payload.notifications ?? state.preferences.notifications
    };
    await json(route, state.preferences);
    return;
  }

  if (method === 'POST' && path === '/api/v1/financial-assistant/chat') {
    const payload = JSON.parse(route.request().postData() || '{}');
    await json(route, {
      allowed: true,
      question: payload.question,
      answer: 'Seu maior risco no mês continua sendo concentração de despesas próximas ao fechamento.',
      disclaimer: 'Resposta baseada apenas nos dados estruturados já calculados.',
      reasonCode: 'structured_context_only',
      context: state.assistantContext
    });
    return;
  }

  if (method === 'POST' && path === '/api/v1/dataportability/import') {
    await json(route, { importedRecords: 12 });
    return;
  }

  if (method === 'POST' && path === '/api/v1/preferences/account/delete') {
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/admin\/users\/[^/]+\/role$/)) {
    const userId = path.split('/')[5];
    const payload = JSON.parse(route.request().postData() || '{}');
    const user = state.adminUsers.find((item) => item.id === userId);
    if (!user) {
      await json(route, { detail: 'Usuário não encontrado.' }, 404);
      return;
    }
    user.role = payload.role ?? user.role;
    await json(route, user);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/admin\/users\/[^/]+\/status$/)) {
    const userId = path.split('/')[5];
    const payload = JSON.parse(route.request().postData() || '{}');
    const user = state.adminUsers.find((item) => item.id === userId);
    if (!user) {
      await json(route, { detail: 'Usuário não encontrado.' }, 404);
      return;
    }
    user.isActive = !!payload.isActive;
    await json(route, user);
    return;
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/admin\/users\/[^/]+$/)) {
    const userId = path.split('/')[5];
    state.adminUsers = state.adminUsers.filter((item) => item.id !== userId);
    delete state.adminUserFeatures[userId];
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/admin\/users\/[^/]+\/features\/[^/]+$/)) {
    const userId = path.split('/')[5];
    const featureKey = decodeURIComponent(path.split('/')[7] || '');
    const payload = JSON.parse(route.request().postData() || '{}');
    const features = state.adminUserFeatures[userId] || [];
    const feature = features.find((item) => item.featureKey === featureKey);
    if (feature) {
      feature.overrideEnabled = !!payload.isEnabled;
      feature.effectiveEnabled = !!payload.isEnabled;
    }
    state.adminUserFeatures[userId] = features;
    await json(route, features);
    return;
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/admin\/users\/[^/]+\/features\/[^/]+$/)) {
    const userId = path.split('/')[5];
    const featureKey = decodeURIComponent(path.split('/')[7] || '');
    const features = state.adminUserFeatures[userId] || [];
    const feature = features.find((item) => item.featureKey === featureKey);
    if (feature) {
      feature.overrideEnabled = null;
      feature.effectiveEnabled = feature.enabledByRole;
    }
    state.adminUserFeatures[userId] = features;
    await json(route, features);
    return;
  }

  if (method === 'POST' && path === '/api/v1/categories') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const created = {
      id: crypto.randomUUID(),
      name: payload.name,
      appliesTo: payload.appliesTo ?? null,
      isDefault: false,
      isActive: true
    };
    state.categories.push(created);
    await json(route, created, 201);
    return;
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/categories\/[^/]+$/)) {
    const categoryId = path.split('/')[4];
    state.categories = state.categories.filter((item) => item.id !== categoryId);
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (method === 'POST' && path === '/api/v1/admin/categories') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const normalizedName = String(payload.name || '').trim().toLowerCase();
    const conflict = state.adminCategories.find(
      (item) => item.name.trim().toLowerCase() === normalizedName && (item.appliesTo === (payload.appliesTo ?? null) || item.appliesTo === null)
    );
    if (conflict) {
      await json(route, { detail: 'Categoria padrão já cadastrada.' }, 409);
      return;
    }
    const created = {
      id: crypto.randomUUID(),
      name: payload.name,
      appliesTo: payload.appliesTo ?? null,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    state.adminCategories.push(created);
    state.categories.push({
      id: created.id,
      name: created.name,
      appliesTo: created.appliesTo,
      isDefault: true,
      isActive: created.isActive
    });
    await json(route, created, 201);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/admin\/categories\/[^/]+$/) && !path.endsWith('/status')) {
    const categoryId = path.split('/')[5];
    const payload = JSON.parse(route.request().postData() || '{}');
    const category = state.adminCategories.find((item) => item.id === categoryId);
    if (!category) {
      await json(route, { detail: 'Categoria padrão não encontrada.' }, 404);
      return;
    }
    category.name = payload.name ?? category.name;
    category.appliesTo = payload.appliesTo ?? null;
    const linked = state.categories.find((item) => item.id === categoryId);
    if (linked) {
      linked.name = category.name;
      linked.appliesTo = category.appliesTo;
    }
    await json(route, category);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/admin\/categories\/[^/]+\/status$/)) {
    const categoryId = path.split('/')[5];
    const payload = JSON.parse(route.request().postData() || '{}');
    const category = state.adminCategories.find((item) => item.id === categoryId);
    if (!category) {
      await json(route, { detail: 'Categoria padrão não encontrada.' }, 404);
      return;
    }
    category.isActive = !!payload.isActive;
    const linked = state.categories.find((item) => item.id === categoryId);
    if (linked) {
      linked.isActive = category.isActive;
    }
    await json(route, category);
    return;
  }

  if (method === 'POST' && path === '/api/v1/admin/parameters/card-brands') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const created = {
      id: Math.max(0, ...state.adminCardBrands.map((item) => item.id)) + 1,
      name: payload.name,
      code: payload.code,
      isActive: true
    };
    state.adminCardBrands.push(created);
    await json(route, created, 201);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/admin\/parameters\/card-brands\/\d+\/status$/)) {
    const id = Number(path.split('/')[6]);
    const payload = JSON.parse(route.request().postData() || '{}');
    const brand = state.adminCardBrands.find((item) => item.id === id);
    if (!brand) {
      await json(route, { detail: 'Bandeira não encontrada.' }, 404);
      return;
    }
    brand.isActive = !!payload.isActive;
    await json(route, brand);
    return;
  }

  if (method === 'POST' && path === '/api/v1/admin/parameters/payment-methods') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const created = {
      id: Math.max(0, ...state.adminPaymentMethods.map((item) => item.id)) + 1,
      name: payload.name,
      isActive: true
    };
    state.adminPaymentMethods.push(created);
    await json(route, created, 201);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/admin\/parameters\/payment-methods\/\d+\/status$/)) {
    const id = Number(path.split('/')[6]);
    const payload = JSON.parse(route.request().postData() || '{}');
    const item = state.adminPaymentMethods.find((methodItem) => methodItem.id === id);
    if (!item) {
      await json(route, { detail: 'Forma de pagamento não encontrada.' }, 404);
      return;
    }
    item.isActive = !!payload.isActive;
    await json(route, item);
    return;
  }

  if (method === 'POST' && path === '/api/v1/admin/parameters/institutions') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const created = {
      id: Math.max(0, ...state.adminInstitutions.map((item) => item.id)) + 1,
      name: payload.name,
      type: payload.type || 'Bank',
      isActive: true
    };
    state.adminInstitutions.push(created);
    await json(route, created, 201);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/admin\/parameters\/institutions\/\d+\/status$/)) {
    const id = Number(path.split('/')[6]);
    const payload = JSON.parse(route.request().postData() || '{}');
    const item = state.adminInstitutions.find((institution) => institution.id === id);
    if (!item) {
      await json(route, { detail: 'Instituição não encontrada.' }, 404);
      return;
    }
    item.isActive = !!payload.isActive;
    await json(route, item);
    return;
  }

  if (method === 'PUT' && path === '/api/v1/admin/parameters/notification-settings') {
    const payload = JSON.parse(route.request().postData() || '{}');
    state.adminNotificationSettings = { ...state.adminNotificationSettings, ...payload };
    await json(route, state.adminNotificationSettings);
    return;
  }

  if (method === 'PUT' && path === '/api/v1/admin/parameters/robot-settings') {
    const payload = JSON.parse(route.request().postData() || '{}');
    state.adminRobotSettings = {
      enabled: payload.enabled ?? state.adminRobotSettings.enabled,
      dailyRunTimeUtc: payload.dailyRunTimeUtc ?? state.adminRobotSettings.dailyRunTimeUtc
    };
    await json(route, state.adminRobotSettings);
    return;
  }

  if (method === 'POST' && path === '/api/v1/admin/parameters/test-email') {
    const payload = JSON.parse(route.request().postData() || '{}');
    await json(route, { to: payload.to, sentAtUtc: new Date().toISOString() });
    return;
  }

  if (method === 'POST' && path.match(/^\/api\/v1\/admin\/robots\/run\/[^/]+$/)) {
    const robotName = decodeURIComponent(path.split('/')[6] || '');
    const run = buildRobotRun(robotName);
    state.adminRobotRuns = [run, ...state.adminRobotRuns];
    state.adminRobots = state.adminRobots.map((robot) =>
      robot.robotName === robotName
        ? {
            ...robot,
            lastStartedAt: run.startedAt,
            lastFinishedAt: run.finishedAt,
            lastDurationMs: run.durationMs,
            lastSuccess: run.success,
            lastProcessedCount: run.processedCount,
            lastMetrics: run.metrics,
            lastCorrelationId: run.correlationId,
            lastHostName: run.hostName,
            lastError: run.error
          }
        : robot
    );
    await json(route, run);
    return;
  }

  if (method === 'POST' && path === '/api/v1/admin/robots/run-all') {
    const runs = state.adminRobots.map((robot) => buildRobotRun(robot.robotName));
    state.adminRobotRuns = [...runs, ...state.adminRobotRuns];
    state.adminRobots = state.adminRobots.map((robot, index) => ({
      ...robot,
      lastStartedAt: runs[index].startedAt,
      lastFinishedAt: runs[index].finishedAt,
      lastDurationMs: runs[index].durationMs,
      lastSuccess: runs[index].success,
      lastProcessedCount: runs[index].processedCount,
      lastMetrics: runs[index].metrics,
      lastCorrelationId: runs[index].correlationId,
      lastHostName: runs[index].hostName,
      lastError: runs[index].error
    }));
    await json(route, runs);
    return;
  }

  if (method === 'POST' && path.match(/^\/api\/v1\/loans\/[^/]+\/installments\/[^/]+\/pay$/)) {
    const parts = path.split('/');
    const contractId = parts[4];
    const installmentId = parts[6];
    const loan = state.loans.find((item) => item.id === contractId);
    if (!loan) {
      await json(route, { title: 'Contrato não encontrado', detail: 'O contrato informado não existe.' }, 404);
      return;
    }
    const installment = loan.installments.find((item) => item.id === installmentId);
    if (!installment) {
      await json(route, { title: 'Parcela não encontrada', detail: 'A parcela informada não existe.' }, 404);
      return;
    }
    if (installment.status === 'Paid') {
      await json(route, { title: 'Parcela já paga', detail: 'Esta parcela já foi paga.' }, 409);
      return;
    }
    installment.status = 'Paid';
    installment.paidAt = new Date().toISOString();
    loan.openInstallments = Math.max(0, loan.openInstallments - 1);
    await json(route, installment);
    return;
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/budget\/\d+\/\d+\/items$/)) {
    const parts = path.split('/');
    const year = Number(parts[4]);
    const month = Number(parts[5]);
    const items: Array<{ categoryName: string; plannedAmount: number }> = JSON.parse(route.request().postData() || '[]');
    for (const item of items) {
      const existing = state.budgetItems.find((b) => b.categoryName === item.categoryName);
      if (existing) {
        existing.plannedAmount = Number(item.plannedAmount);
        existing.variance = existing.plannedAmount - existing.realizedAmount;
      } else {
        state.budgetItems.push({
          id: crypto.randomUUID(),
          categoryName: item.categoryName,
          plannedAmount: Number(item.plannedAmount),
          realizedAmount: 0,
          variance: Number(item.plannedAmount)
        });
      }
    }
    const totalPlanned = state.budgetItems.reduce((s, b) => s + b.plannedAmount, 0);
    const totalRealized = state.budgetItems.reduce((s, b) => s + b.realizedAmount, 0);
    await json(route, { year, month, totalPlanned, totalRealized, totalVariance: totalPlanned - totalRealized, items: state.budgetItems });
    return;
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/budget\/items\/[^/]+$/)) {
    const itemId = path.split('/')[5];
    state.budgetItems = state.budgetItems.filter((b) => b.id !== itemId);
    await route.fulfill({ status: 204, body: '' });
    return;
  }

  if (method === 'POST' && path === '/api/v1/scenarios/simulate') {
    const payload = JSON.parse(route.request().postData() || '{}');
    const extraMonthlyIncome = Number(payload.extraMonthlyIncome || 0);
    const extraMonthlyExpense = Number(payload.extraMonthlyExpense || 0);
    const savingsRatePercent = Number(payload.savingsRatePercent || 0);
    const baseBalance = 6780;
    const impactAmount = (extraMonthlyIncome - extraMonthlyExpense) + (baseBalance * savingsRatePercent / 100);
    const basePoints: ScenarioProjectionPoint[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().split('T')[0], baseClosingBalance: baseBalance + i * 50, scenarioClosingBalance: baseBalance + i * 50 };
    });
    const scenarioPoints: ScenarioProjectionPoint[] = basePoints.map((p, i) => ({
      ...p,
      scenarioClosingBalance: p.baseClosingBalance + i * (impactAmount / 30)
    }));
    await json(route, {
      period: payload.period || 'month',
      referenceDate: new Date().toISOString().split('T')[0],
      baseProjectedClosingBalance: baseBalance,
      scenarioProjectedClosingBalance: baseBalance + impactAmount,
      impactAmount,
      monthlySavingsPotential: extraMonthlyIncome - extraMonthlyExpense,
      basePoints,
      scenarioPoints
    });
    return;
  }

  if (method !== 'GET') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    return;
  }

  if (path === '/api/v1/profile') {
    await json(route, {
      userId: '44444444-4444-4444-4444-444444444444',
      fullName: state.profileName,
      document: '52998224725',
      phone: '(81) 99999-9999',
      birthDate: '1991-03-02T00:00:00Z',
      city: 'Recife',
      state: 'PE',
      country: 'Brasil',
      financialGoal: 'organizar-fluxo',
      carryOverDay: 12,
      intelligenceMode: 'C',
      language: 'pt-BR',
      currency: 'BRL',
      locales: ['pt-BR']
    });
    return;
  }

  if (path === '/api/v1/onboarding') {
    await json(route, { step: state.onboardingCompleted ? 3 : 0, completed: state.onboardingCompleted });
    return;
  }

  if (path === '/api/v1/notifications') {
    await json(route, state.notifications);
    return;
  }

  if (path === '/api/v1/accounts') {
    await json(route, state.accounts);
    return;
  }

  if (path === '/api/v1/accounts/summary/real-balance') {
    await json(route, {
      period: 'month',
      referenceDate: '2026-03-09',
      periodStart: '2026-03-01',
      periodEnd: '2026-03-31',
      activeAccountsBalance: 8580,
      pendingExpensesAmount: 1800,
      pendingExpensesCount: 3,
      pendingIncomesAmount: 950,
      pendingIncomesCount: 1,
      realAvailableBalance: 6780,
      projectedAvailableBalance: 7730,
      overdueExpensesAmount: 0,
      overdueExpensesCount: 0,
      dueSoonExpensesAmount: 600
    });
    return;
  }

  if (path === '/api/v1/accounts/summary/debts') {
    await json(route, {
      referenceDate: '2026-03-09',
      totalDebt: 700,
      cardDebt: 300,
      otherDebt: 400,
      overdueDebt: 0,
      dueSoonDebt: 300,
      openItemsCount: 2,
      buckets: [
        { key: 'cards', label: 'Cartões', totalAmount: 300, itemsCount: 1 },
        { key: 'other', label: 'Outras obrigações', totalAmount: 400, itemsCount: 1 },
        { key: 'overdue', label: 'Em atraso', totalAmount: 0, itemsCount: 0 }
      ],
      nextItems: [
        {
          installmentId: 'inst-1',
          planId: 'plan-1',
          family: 'card',
          title: 'Mercado Fatura',
          relatedName: 'Cartao principal',
          dueDate: '2026-03-18',
          originalAmount: 300,
          paidAmount: 120,
          openAmount: 180,
          status: 'Open',
          statementReference: '03/2026'
        }
      ]
    });
    return;
  }

  if (path === '/api/v1/accounts/summary/net-worth') {
    await json(route, {
      referenceDate: '2026-03-09',
      assets: { accountsBalance: 8580, investmentsBalance: 1200, totalAssets: 9780 },
      liabilities: { cardDebt: 300, otherOpenLiabilities: 400, totalLiabilities: 700 },
      netWorth: 9080,
      investmentPositionsCount: 1,
      openLiabilitiesCount: 2,
      snapshotLabel: '03/2026'
    });
    return;
  }

  if (path === '/api/v1/accounts/summary/net-worth/history') {
    await json(route, {
      referenceDate: '2026-03-09',
      months: 3,
      hasEstimatedPoints: false,
      notes: [],
      points: [
        { referenceDate: '2026-01-31', label: 'Jan', accountsBalance: 7600, investmentsBalance: 800, totalAssets: 8400, totalLiabilities: 900, netWorth: 7500, isEstimated: false },
        { referenceDate: '2026-02-28', label: 'Fev', accountsBalance: 8000, investmentsBalance: 950, totalAssets: 8950, totalLiabilities: 820, netWorth: 8130, isEstimated: false },
        { referenceDate: '2026-03-31', label: 'Mar', accountsBalance: 8580, investmentsBalance: 1200, totalAssets: 9780, totalLiabilities: 700, netWorth: 9080, isEstimated: false }
      ]
    });
    return;
  }

  if (path === '/api/v1/accounts/summary/projection') {
    await json(route, {
      period: 'month',
      referenceDate: '2026-03-09',
      projectionStart: '2026-03-09',
      projectionEnd: '2026-03-31',
      openingBalance: 6780,
      projectedClosingBalance: 7730,
      lowestBalance: 6400,
      lowestBalanceDate: '2026-03-14',
      riskDate: null,
      points: [
        { referenceDate: '2026-03-09', openingBalance: 6780, closingBalance: 6780, incomesAmount: 0, expensesAmount: 0 },
        { referenceDate: '2026-03-14', openingBalance: 6500, closingBalance: 6400, incomesAmount: 0, expensesAmount: 100 },
        { referenceDate: '2026-03-31', openingBalance: 7700, closingBalance: 7730, incomesAmount: 30, expensesAmount: 0 }
      ]
    });
    return;
  }

  if (path === '/api/v1/accounts/summary/risk') {
    await json(route, {
      period: 'month',
      referenceDate: '2026-03-09',
      score: 84,
      classification: 'healthy',
      priority: 'warning',
      riskDate: null,
      currentCoverage: 78,
      projectedCoverage: 88,
      projectedBalance: 7730,
      reasonCodes: ['healthy_projection'],
      scoreBreakdown: ['Fluxo positivo no período', 'Sem despesas atrasadas', 'Reserva ainda abaixo da meta ideal'],
      recommendations: [
        {
          id: 'risk-topup',
          severity: 'warn',
          text: 'Direcione parte da sobra para a reserva de segurança.',
          actionLabel: 'Ir para contas',
          route: '/contas',
          queryParams: { focus: 'reserve' }
        }
      ]
    });
    return;
  }

  if (path === '/api/v1/accounts/summary/insights') {
    await json(route, {
      period: 'month',
      referenceDate: '2026-03-09',
      primaryInsight: {
        family: 'preventive',
        scenario: 'stable',
        priority: 'ok',
        title: 'Fluxo sob controle',
        message: 'Seu saldo disponível cobre as obrigações do período.',
        action: 'Manter rotina',
        healthScore: 84,
        riskDate: null,
        currentCoverage: 78,
        projectedCoverage: 88,
        projectedBalance: 7730,
        highlights: ['Cartões sem atraso', 'Menor saldo projetado em 14/03'],
        tips: ['Mantenha aportes semanais', 'Revise o bucket de outras obrigações'],
        reasonCodes: ['healthy_projection'],
        scoreBreakdown: ['Fluxo positivo', 'Exposição moderada a gastos próximos'],
        recommendations: [
          {
            id: 'insight-debts',
            severity: 'info',
            text: 'Acompanhe a composição da dívida para evitar concentração em obrigações avulsas.',
            actionLabel: 'Ver dívidas',
            route: '/dashboard',
            queryParams: { section: 'debts' }
          }
        ]
      },
      insights: []
    });
    return;
  }

  if (path === '/api/v1/accounts/summary/recommendations') {
    await json(route, {
      period: 'month',
      referenceDate: '2026-03-09',
      minScoreApplied: 50,
      items: [
        {
          id: 'rec-1',
          severity: 'warn',
          text: 'Separe R$ 300,00 para reforçar a reserva.',
          actionLabel: 'Ver contas',
          route: '/contas',
          queryParams: { focus: 'reserve' },
          score: 78
        },
        {
          id: 'rec-2',
          severity: 'info',
          text: 'Revise despesas futuras de março para preservar o fechamento.',
          actionLabel: 'Ver despesas',
          route: '/despesas',
          queryParams: { focus: 'upcoming' },
          score: 71
        }
      ]
    });
    return;
  }

  if (path.match(/^\/api\/v1\/accounts\/[^/]+\/transactions$/)) {
    const accountId = path.split('/')[4];
    const items = state.accountTransactions[accountId] ?? [];
    await json(route, { items, totalCount: items.length, page: 1, pageSize: 50, totalPages: 1, hasNextPage: false });
    return;
  }

  if (path === '/api/v1/cards') {
    await json(route, state.cards);
    return;
  }

  if (path === '/api/v1/loans') {
    await json(route, state.loans);
    return;
  }

  if (path === '/api/v1/monthlysnapshots') {
    await json(route, state.snapshots);
    return;
  }

  if (path === '/api/v1/subscriptions/catalog') {
    await json(route, state.subscriptionCatalog);
    return;
  }

  if (path === '/api/v1/cards/debt/total') {
    await json(route, { total: 180 });
    return;
  }

  if (path.match(/^\/api\/v1\/cards\/[^/]+\/statements$/)) {
    await json(route, state.cardStatements);
    return;
  }

  if (path === '/api/v1/lookups/card-brands') {
    await json(route, [{ id: 1, code: 'visa', name: 'Visa', isActive: true }]);
    return;
  }

  if (path === '/api/v1/lookups/institutions') {
    await json(route, [{ id: 1, name: 'Banco X', type: 'Bank' }]);
    return;
  }

  if (path === '/api/v1/categories') {
    const type = url.searchParams.get('appliesTo');
    const filtered = type ? state.categories.filter((item) => item.appliesTo === type) : state.categories;
    await json(route, filtered);
    return;
  }

  if (path === '/api/v1/admin/categories') {
    const includeInactive = url.searchParams.get('includeInactive') !== 'false';
    await json(route, includeInactive ? state.adminCategories : state.adminCategories.filter((item) => item.isActive));
    return;
  }

  if (path === '/api/v1/preferences/security-summary') {
    await json(route, state.securitySummary);
    return;
  }

  if (path === '/api/v1/preferences') {
    await json(route, state.preferences);
    return;
  }

  if (path === '/api/v1/preferences/privacy-summary') {
    await json(route, state.privacySummary);
    return;
  }

  if (path === '/api/v1/financial-assistant/context') {
    await json(route, state.assistantContext);
    return;
  }

  if (path === '/api/v1/dataportability/export') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'content-disposition': 'attachment; filename="investindo-export.json"'
      },
      body: JSON.stringify({ exportedAt: '2026-03-14T10:00:00Z', records: 12 })
    });
    return;
  }

  if (path === '/api/v1/admin/users') {
    await json(route, state.adminUsers);
    return;
  }

  if (path.match(/^\/api\/v1\/admin\/users\/[^/]+\/features$/)) {
    const userId = path.split('/')[5];
    await json(route, state.adminUserFeatures[userId] || []);
    return;
  }

  if (path === '/api/v1/admin/parameters/card-brands') {
    await json(route, state.adminCardBrands);
    return;
  }

  if (path === '/api/v1/admin/parameters/payment-methods') {
    await json(route, state.adminPaymentMethods);
    return;
  }

  if (path === '/api/v1/admin/parameters/institutions') {
    await json(route, state.adminInstitutions);
    return;
  }

  if (path === '/api/v1/admin/parameters/notification-settings') {
    await json(route, state.adminNotificationSettings);
    return;
  }

  if (path === '/api/v1/admin/parameters/robot-settings') {
    await json(route, state.adminRobotSettings);
    return;
  }

  if (path === '/api/v1/admin/parameters/scalability-runtime') {
    await json(route, {
      currentPhase: 'Fase 2',
      enabledControls: ['cache distribuído', 'filas assíncronas para robôs'],
      nextPhaseTargets: ['particionamento de jobs', 'observabilidade centralizada'],
      longTermTargets: ['multi-tenant', 'sharding de dados históricos']
    });
    return;
  }

  if (path.startsWith('/api/v1/admin/robots/monitor')) {
    await json(route, {
      summary24h: buildRobotSummary(state.adminRobotRuns),
      robots: state.adminRobots,
      recentRuns: state.adminRobotRuns
    });
    return;
  }

  if (path === '/api/v1/plans') {
    const type = url.searchParams.get('type');
    const plans = type ? state.plans.filter((plan) => plan.type === type) : state.plans;
    await json(route, plans);
    return;
  }

  if (path === '/api/v1/installments') {
    await json(route, []);
    return;
  }

  if (path === '/api/v1/receitas/summary') {
    await json(route, {
      month: '2026-03',
      total: 4200,
      totalRecurring: 3200,
      totalOneTime: 1000,
      previousMonth: null,
      history: []
    });
    return;
  }

  if (path.match(/^\/api\/v1\/budget\/\d+\/\d+$/)) {
    const parts = path.split('/');
    const year = Number(parts[4]);
    const month = Number(parts[5]);
    const totalPlanned = state.budgetItems.reduce((s, b) => s + b.plannedAmount, 0);
    const totalRealized = state.budgetItems.reduce((s, b) => s + b.realizedAmount, 0);
    await json(route, { year, month, totalPlanned, totalRealized, totalVariance: totalPlanned - totalRealized, items: state.budgetItems });
    return;
  }

  if (path.match(/^\/api\/v1\/reports\/monthly-summary\/\d+\/\d+$/)) {
    const parts = path.split('/');
    const year = Number(parts[5]);
    const month = Number(parts[6]);
    const expensesByCategory = [
      { categoryName: 'Alimentação', amount: 1500, percentageOfTotal: 48.4 },
      { categoryName: 'Transporte', amount: 800, percentageOfTotal: 25.8 },
      { categoryName: 'Moradia', amount: 700, percentageOfTotal: 22.6 }
    ];
    await json(route, {
      year, month,
      totalIncome: 8000,
      totalExpenses: 3100,
      netBalance: 4900,
      savingsRate: 61.3,
      expensesByCategory,
      topExpenses: expensesByCategory.slice(0, 3)
    });
    return;
  }

  await json(route, []);
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body)
  });
}

function buildRobotRun(robotName: string, triggeredByUserId: string | null = '44444444-4444-4444-4444-444444444444'): RobotExecutionLog {
  const startedAt = new Date().toISOString();
  const finishedAt = new Date(Date.now() + 8_000).toISOString();
  return {
    id: crypto.randomUUID(),
    robotName,
    startedAt,
    finishedAt,
    durationMs: 8000,
    correlationId: `corr-${Math.random().toString(16).slice(2, 10)}`,
    hostName: 'playwright-auth',
    triggeredByUserId,
    success: true,
    processedCount: 2,
    metrics: {
      itemsGenerated: 1,
      emailsAttempted: 1,
      emailsSent: 1,
      emailsFailed: 0,
      zeroItemsReasonCode: null
    },
    wasSkipped: false,
    skipReason: null,
    error: null
  };
}

function buildRobotSummary(runs: RobotExecutionLog[]) {
  const totalRuns = runs.length;
  const successRuns = runs.filter((run) => run.success).length;
  const failedRuns = totalRuns - successRuns;
  const itemsGenerated = runs.reduce((sum, run) => sum + (run.metrics.itemsGenerated || 0), 0);
  const emailsAttempted = runs.reduce((sum, run) => sum + (run.metrics.emailsAttempted || 0), 0);
  const emailsSent = runs.reduce((sum, run) => sum + (run.metrics.emailsSent || 0), 0);
  const emailsFailed = runs.reduce((sum, run) => sum + (run.metrics.emailsFailed || 0), 0);
  return {
    totalRuns,
    successRuns,
    failedRuns,
    successRatePercent: totalRuns ? Math.round((successRuns / totalRuns) * 100) : 0,
    itemsGenerated,
    emailsAttempted,
    emailsSent,
    emailsFailed
  };
}

function buildJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'none', typ: 'JWT' };
  return `${encode(header)}.${encode(payload)}.signature`;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
