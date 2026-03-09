import { Page, Route } from '@playwright/test';
import { UserRole } from '../../src/app/roles';

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

type ApiFailure = {
  path: string | RegExp;
  method?: string;
  status?: number;
  body?: unknown;
};

type SetupAuthenticatedAppOptions = {
  role?: UserRole;
  profileName?: string;
  notifications?: unknown[];
  onboardingCompleted?: boolean;
  apiFailures?: ApiFailure[];
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
    cardStatements: structuredClone(baseCardStatements),
    role,
    profileName: options.profileName || 'Henrique Santos',
    notifications: structuredClone(options.notifications || []),
    onboardingCompleted: options.onboardingCompleted ?? true,
    apiFailures: options.apiFailures || []
  };

  await page.addInitScript((token) => {
    window.localStorage.setItem('access_token', token);
    window.localStorage.setItem('refresh_token', 'refresh-token');
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    window.localStorage.setItem('user_role', payload.role);
    window.localStorage.setItem('access_expires_at', new Date(Date.now() + 60 * 60 * 1000).toISOString());
  }, accessToken);

  await page.route('**/api/v1/**', async (route) => fulfillApi(route, state));
}

async function fulfillApi(route: Route, state: {
  accounts: Account[];
  accountTransactions: Record<string, AccountTransaction[]>;
  cards: Card[];
  cardStatements: typeof baseCardStatements;
  role: UserRole;
  profileName: string;
  notifications: unknown[];
  onboardingCompleted: boolean;
  apiFailures: ApiFailure[];
}): Promise<void> {
  const url = new URL(route.request().url());
  const path = url.pathname.replace(/\/+$/, '');
  const method = route.request().method().toUpperCase();

  const apiFailure = state.apiFailures.find((failure) => {
    const matchesMethod = !failure.method || failure.method.toUpperCase() === method;
    const matchesPath = typeof failure.path === 'string' ? failure.path === path : failure.path.test(path);
    return matchesMethod && matchesPath;
  });
  if (apiFailure) {
    await json(route, apiFailure.body ?? { detail: 'Falha simulada.' }, apiFailure.status ?? 500);
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

  if (method !== 'GET') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    return;
  }

  if (path === '/api/v1/profile') {
    await json(route, {
      userId: '44444444-4444-4444-4444-444444444444',
      fullName: state.profileName,
      document: '12345678901',
      phone: '(81) 99999-9999',
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
    await json(route, { step: state.onboardingCompleted ? 2 : 0, completed: state.onboardingCompleted });
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
    await json(route, state.accountTransactions[accountId] ?? []);
    return;
  }

  if (path === '/api/v1/cards') {
    await json(route, state.cards);
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
    await json(route, []);
    return;
  }

  if (path === '/api/v1/admin/users') {
    await json(route, [
      {
        id: 'admin-user-1',
        name: 'Henrique Admin',
        email: 'admin@example.com',
        role: 'Admin',
        isActive: true,
        createdAt: '2026-01-10T10:00:00Z'
      }
    ]);
    return;
  }

  if (path.match(/^\/api\/v1\/admin\/users\/[^/]+\/features$/)) {
    await json(route, [
      { featureKey: 'admin.users.manage', effectiveEnabled: true, enabledByRole: true, overrideEnabled: null },
      { featureKey: 'admin.parameters.manage', effectiveEnabled: true, enabledByRole: true, overrideEnabled: null }
    ]);
    return;
  }

  if (path === '/api/v1/admin/parameters/card-brands') {
    await json(route, [{ id: 1, name: 'Visa', code: 'visa', isActive: true }]);
    return;
  }

  if (path === '/api/v1/admin/parameters/payment-methods') {
    await json(route, [{ id: 1, name: 'PIX', isActive: true }]);
    return;
  }

  if (path === '/api/v1/admin/parameters/institutions') {
    await json(route, [{ id: 1, name: 'Banco X', type: 'Bank', isActive: true }]);
    return;
  }

  if (path === '/api/v1/admin/parameters/notification-settings') {
    await json(route, {
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
    });
    return;
  }

  if (path === '/api/v1/admin/parameters/robot-settings') {
    await json(route, { enabled: true, dailyRunTimeUtc: '08:00:00' });
    return;
  }

  if (path.startsWith('/api/v1/admin/robots/monitor')) {
    await json(route, {
      summary24h: {
        totalRuns: 5,
        successRuns: 4,
        failedRuns: 1,
        successRatePercent: 80,
        itemsGenerated: 12,
        emailsAttempted: 8,
        emailsSent: 7,
        emailsFailed: 1
      },
      robots: [],
      recentRuns: [
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
      ]
    });
    return;
  }

  if (path === '/api/v1/plans') {
    await json(route, []);
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

  await json(route, []);
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body)
  });
}

function buildJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'none', typ: 'JWT' };
  return `${encode(header)}.${encode(payload)}.signature`;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
