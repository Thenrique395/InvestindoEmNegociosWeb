export type AccountType = 'Checking' | 'Savings' | 'DigitalWallet' | 'Cash' | 'Other';
export type AccountTransactionKind = 'Credit' | 'Debit';
export type AccountTransactionType = 'Income' | 'Expense' | 'Transfer';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface AccountRequest {
  name: string;
  type: AccountType;
  initialBalance: number;
  isActive: boolean;
}

export interface AccountResponse {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalanceResponse {
  accountId: string;
  initialBalance: number;
  transactionsNet: number;
  currentBalance: number;
}

export interface RealAvailableBalanceResponse {
  period: 'month' | 'quarter' | 'year';
  referenceDate: string;
  periodStart: string;
  periodEnd: string;
  activeAccountsBalance: number;
  pendingExpensesAmount: number;
  pendingExpensesCount: number;
  pendingIncomesAmount: number;
  pendingIncomesCount: number;
  realAvailableBalance: number;
  projectedAvailableBalance: number;
  overdueExpensesAmount: number;
  overdueExpensesCount: number;
  dueSoonExpensesAmount: number;
}

export interface DebtSummaryBucketResponse {
  key: string;
  label: string;
  totalAmount: number;
  itemsCount: number;
}

export interface DebtSummaryItemResponse {
  installmentId: string;
  planId: string;
  family: 'card' | 'liability';
  title: string;
  relatedName?: string | null;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  openAmount: number;
  status: string;
  statementReference?: string | null;
}

export interface DebtSummaryResponse {
  referenceDate: string;
  totalDebt: number;
  cardDebt: number;
  otherDebt: number;
  overdueDebt: number;
  dueSoonDebt: number;
  openItemsCount: number;
  buckets: DebtSummaryBucketResponse[];
  nextItems: DebtSummaryItemResponse[];
}

export interface SubscriptionSummaryItemResponse {
  planId: string;
  title: string;
  amount: number;
  cardName?: string | null;
}

export interface SubscriptionsSummaryResponse {
  referenceDate: string;
  monthlyTotal: number;
  count: number;
  items: SubscriptionSummaryItemResponse[];
}

export interface WealthAssetBreakdownResponse {
  accountsBalance: number;
  investmentsBalance: number;
  tangibleAssetsBalance: number;
  totalAssets: number;
}

export interface WealthLiabilityBreakdownResponse {
  cardDebt: number;
  otherOpenLiabilities: number;
  totalLiabilities: number;
}

export interface NetWorthSummaryResponse {
  referenceDate: string;
  assets: WealthAssetBreakdownResponse;
  liabilities: WealthLiabilityBreakdownResponse;
  netWorth: number;
  investmentPositionsCount: number;
  openLiabilitiesCount: number;
  snapshotLabel: string;
}

export interface NetWorthHistoryPointResponse {
  referenceDate: string;
  label: string;
  accountsBalance: number;
  investmentsBalance: number;
  tangibleAssetsBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  isEstimated: boolean;
}

export interface NetWorthHistoryResponse {
  referenceDate: string;
  months: number;
  hasEstimatedPoints: boolean;
  notes: string[];
  points: NetWorthHistoryPointResponse[];
}

export interface CashflowProjectionPointResponse {
  date: string;
  openingBalance: number;
  incomesAmount: number;
  incomesCount: number;
  expensesAmount: number;
  expensesCount: number;
  closingBalance: number;
}

export interface CashflowProjectionResponse {
  period: 'month' | 'quarter' | 'year';
  referenceDate: string;
  projectionStart: string;
  projectionEnd: string;
  openingBalance: number;
  projectedClosingBalance: number;
  lowestBalance: number;
  lowestBalanceDate?: string | null;
  riskDate?: string | null;
  points: CashflowProjectionPointResponse[];
}

export interface RiskBotRecommendationResponse {
  id: string;
  severity: 'danger' | 'warn' | 'info';
  text: string;
  actionLabel: string;
  route: string;
  queryParams: Record<string, string>;
  amount?: number | null;
  dueDate?: string | null;
}

export interface RiskBotAssessmentResponse {
  period: 'month' | 'quarter' | 'year';
  referenceDate: string;
  score: number;
  classification: 'critical' | 'warning' | 'healthy';
  priority: 'critical' | 'warning' | 'ok';
  riskDate?: string | null;
  currentCoverage: number;
  projectedCoverage: number;
  projectedBalance: number;
  reasonCodes: string[];
  scoreBreakdown: string[];
  recommendations: RiskBotRecommendationResponse[];
}

export interface InsightEngineItemResponse {
  family: 'reactive' | 'preventive' | 'structural' | 'patrimonial';
  scenario: string;
  priority: 'critical' | 'warning' | 'ok';
  title: string;
  message: string;
  action: string;
  healthScore: number;
  riskDate?: string | null;
  currentCoverage: number;
  projectedCoverage: number;
  projectedBalance: number;
  highlights: string[];
  tips: string[];
  reasonCodes: string[];
  scoreBreakdown: string[];
  recommendations: RiskBotRecommendationResponse[];
}

export interface InsightEngineResponse {
  period: 'month' | 'quarter' | 'year';
  referenceDate: string;
  primaryInsight?: InsightEngineItemResponse | null;
  insights: InsightEngineItemResponse[];
}

export interface RecommendationItemResponse {
  id: string;
  score: number;
  severity: 'danger' | 'warn' | 'info';
  source: string;
  title: string;
  text: string;
  actionLabel: string;
  route: string;
  queryParams: Record<string, string>;
  reasonCodes: string[];
  amount?: number | null;
  dueDate?: string | null;
}

export interface RecommendationEngineResponse {
  period: 'month' | 'quarter' | 'year';
  referenceDate: string;
  minScoreApplied: number;
  items: RecommendationItemResponse[];
}

export interface AccountTransactionResponse {
  id: string;
  accountId: string;
  occurredAt: string;
  type: AccountTransactionType;
  kind: AccountTransactionKind;
  amount: number;
  description: string;
  sourceType?: string | null;
  sourceGroup?: string | null;
  sourceLabel?: string | null;
  sourceId?: string | null;
  createdAt: string;
}

export interface AccountTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  occurredAt?: string | null;
  description?: string | null;
}

export interface AccountTransferResponse {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  occurredAtUtc: string;
  description: string;
}
