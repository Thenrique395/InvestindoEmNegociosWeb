import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { EMPTY, Subject, Subscription, filter, fromEvent, interval, merge, debounceTime } from 'rxjs';
import { ApiDataService, StoredExpense, StoredIncome, StoredCard } from '../../core/data/api-data.service';
import { CardsService } from '../../core/cards.service';
import { GoalsService, Goal, GoalStatus } from '../../core/goals.service';
import { Router, RouterModule } from '@angular/router';
import { expenseStatusLabel, incomeStatusLabel, installmentStatusTone, resolveInstallmentStatus } from '../../core/utils/status';
import { OnboardingService } from '../../core/onboarding.service';
import { formatCompactCurrency, formatCurrencyValue, formatMonthLabel, formatMonthYearLabel, monthKeyFromLocaleDate, parseLocaleDate } from '../../core/utils/locale-utils';
import {
  calculateInsightHealthScore,
  dateKey,
  estimateRiskDayFromCurrentData,
  formatCurrency,
  formatDelta,
  getFinancialGoalLabel,
  hasCriticalOverdueExpenseContext,
  isExpenseOpen,
  isIncomePending,
  isIncomeReceived,
  rangeEndDate,
  resolveInsightShortGoal
} from '../../core/utils/home-insight.utils';
import { AccountsService, AccountResponse, CashflowProjectionResponse, DebtSummaryResponse, InsightEngineItemResponse, InsightEngineResponse, NetWorthHistoryResponse, NetWorthSummaryResponse, RealAvailableBalanceResponse, RecommendationEngineResponse, RiskBotAssessmentResponse, SubscriptionsSummaryResponse } from '../../core/accounts.service';
import { AuthService } from '../../core/auth.service';
import { AttentionCardComponent } from './attention-card/attention-card.component';
import { AttentionInput } from './attention-card/attention-card.model';
import { EvolutionCardComponent } from './evolution-card/evolution-card.component';
import { GoalsCardComponent } from './goals-card/goals-card.component';
import { GoalEntry } from './goals-card/goals-card.model';
import { ActivityItem, RecentActivityCardComponent } from './recent-activity-card/recent-activity-card.component';
import { RecurrencesCardComponent } from './recurrences-card/recurrences-card.component';
import { SpendBreakdownCardComponent } from './spend-breakdown-card/spend-breakdown-card.component';
import { SpendSlice } from './spend-breakdown-card/spend-breakdown-card.model';
import { RecurrenceEntry } from './recurrences-card/recurrences-card.model';
import { EvolutionInput } from './evolution-card/evolution-card.model';
import { UpcomingCardComponent } from './upcoming-card/upcoming-card.component';
import { UpcomingEntry } from './upcoming-card/upcoming-card.model';
import { hasAtLeastRole, UserRole } from '../../core/roles';
import { ProfileService } from '../../core/profile.service';
import { NotificationsService, NotificationItem } from '../../core/notifications.service';
import { AppCurrencyPipe } from '../../shared/app-currency.pipe';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { AiFinancialHealthResponse, AiHealthStatus, FinancialAssistantService } from '../../core/financial-assistant.service';
import { CategorySlice } from './category-breakdown/category-breakdown.model';
import { InstallmentStatusTone } from '../../core/utils/status';
import { UpgradeCtaComponent } from './upgrade-cta.component';
import { FinancialOverviewComponent } from './financial-overview/financial-overview.component';
import { FinancialOverviewInput } from './financial-overview/financial-overview.model';
import { MonthlyFlowPoint, buildMonthlyFlowSeries } from '../../core/utils/monthly-flow.utils';
import { SectionCardComponent } from '../../shared/section-card/section-card.component';
import { netWorthDelta } from './dashboard-overview.model';
import { BudgetResponse, BudgetService } from '../../core/budget.service';
import { BudgetItemView, BudgetOverview, buildBudgetItemViews, buildBudgetOverview } from '../../core/budget-overview.model';
import { InvestmentPosition, InvestmentsService } from '../../core/investments.service';
import { buildInvestmentsOverview, InvestmentsOverview } from '../../core/investments-overview.model';

type InsightDiagnostics = {
  healthScore: number;
  riskDayLabel: string | null;
  overdueExpensesCount: number;
  overdueExpensesAmount: number;
  overdueIncomesCount: number;
  dueSoonExpensesAmount: number;
  projectedBalance: number;
  currentCoverage: number;
  projectedCoverage: number;
};

type InsightPriority = 'Crítico' | 'Atenção' | 'Estável';
type InsightTodoItem = {
  id: string;
  severity: 'danger' | 'warn' | 'info';
  text: string;
  actionLabel: string;
  route: string;
  queryParams: Record<string, string>;
};

/** Lançamento cru do extrato, antes de virar linha em "Atividade recente". */
type DashboardActivityItem = {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  status?: string;
  statusTone?: InstallmentStatusTone;
  recurring?: boolean;
  planId?: string;
};

type DashboardRecurrenceItem = {
  id: string;
  title: string;
  amount: number;
  dateLabel: string;
  kindLabel: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'muted';
  direction: 'income' | 'expense';
};

type DashboardDebtItem = {
  id: string;
  title: string;
  amount: number;
  dateLabel: string;
  kindLabel: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'muted';
};

type NetWorthLinePoint = {
  key: string;
  x: number;
  label: string;
  income: number;
  expense: number;
  netWorth: number;
  incomeY: number;
  expenseY: number;
  netWorthY: number;
  isEstimated: boolean;
  isCurrentMonth: boolean;
};

type CashFlowLinePoint = {
  key: string;
  x: number;
  label: string;
  income: number;
  expense: number;
  incomeY: number;
  expenseY: number;
  isCurrentMonth: boolean;
};

type NetWorthAxisTick = {
  y: number;
  value: number;
  isZero: boolean;
};

type PatrimonioChartSeries = 'income' | 'expense' | 'netWorth';

const DASHBOARD_UPCOMING_DUE_DAYS = 7;
const CONTROLE_FLOW_MONTHS = 6;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    RouterModule,
    AppCurrencyPipe,
    StatusBadgeComponent,
    UpgradeCtaComponent,
    FinancialOverviewComponent,
    EvolutionCardComponent,
    RecurrencesCardComponent,
    GoalsCardComponent,
    SpendBreakdownCardComponent,
    RecentActivityCardComponent,
    AttentionCardComponent,
    UpcomingCardComponent,
    SectionCardComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private subRealBalance?: Subscription;
  private subDebtSummary?: Subscription;
  private subSubscriptionsSummary?: Subscription;
  private subAiHealth?: Subscription;
  private subNetWorth?: Subscription;
  private subNetWorthHistory?: Subscription;
  private subProjection?: Subscription;
  private subRiskAssessment?: Subscription;
  private subInsights?: Subscription;
  private subRecommendations?: Subscription;
  private subBudgetSummary?: Subscription;
  private subInvestmentPositions?: Subscription;
  private latestRobotInsight: NotificationItem | null = null;
  private expensesLoaded = false;
  private incomesLoaded = false;
  private readonly summaryRefresh$ = new Subject<void>();
  private readonly dashboardRealtimeRefreshMs = 15000;

  dataAtual = new Date();
  private expensesRaw: StoredExpense[] = [];
  private incomesRaw: StoredIncome[] = [];
  totalRendas = 0;
  totalRendasPendentes = 0;
  totalDespesas = 0;
  totalDespesasPagas = 0;
  totalDespesasEmAberto = 0;
  saldo = 0;
  saldoAnterior = 0;
  periodo: 'month' | 'quarter' | 'year' = 'month';
  cards: StoredCard[] = [];
  totalDividaCartoes = 0;
  accountBalances: AccountResponse[] = [];
  realBalanceSummary: RealAvailableBalanceResponse | null = null;
  debtSummary: DebtSummaryResponse | null = null;
  subscriptionsSummary: SubscriptionsSummaryResponse | null = null;
  aiHealth: AiFinancialHealthResponse | null = null;
  netWorthSummary: NetWorthSummaryResponse | null = null;
  netWorthHistory: NetWorthHistoryResponse | null = null;
  cashflowProjection: CashflowProjectionResponse | null = null;
  riskAssessment: RiskBotAssessmentResponse | null = null;
  insightEngine: InsightEngineResponse | null = null;
  recommendationEngine: RecommendationEngineResponse | null = null;
  budgetSummary: BudgetResponse | null = null;
  investmentPositions: InvestmentPosition[] = [];
  expenseCategorySlices: CategorySlice[] = [];
  expenseCategoryTotal = 0;
  incomeSourceSlices: CategorySlice[] = [];
  incomeSourceTotal = 0;
  recentTransactions: DashboardActivityItem[] = [];
  monthlyFlowSeries: MonthlyFlowPoint[] = [];
  visiblePatrimonioSeries: Record<PatrimonioChartSeries, boolean> = {
    income: true,
    expense: true,
    netWorth: true
  };
  receitasPeriodoAnterior: number | null = null;
  despesasPeriodoAnterior: number | null = null;
  compromissosResumo = { emAtraso: 0, proximosSeteDias: 0, valorEmAberto: 0 };
  pendenciasDetalhadas: AttentionInput = {
    despesasEmAtraso: { quantidade: 0, valor: 0, diasDoMaisAntigo: null },
    despesasProximas: { quantidade: 0, valor: 0 },
    receitasAtrasadas: { quantidade: 0, valor: 0 },
    faturasFechando: { quantidade: 0, valor: 0 }
  };
  loadErrorSections = new Set<string>();
  loadErrorsDismissed = false;
  goalsRaw: Goal[] = [];
  metasResumo = {
    total: 0,
    planned: 0,
    inProgress: 0,
    completed: 0,
    canceled: 0,
    targetTotal: 0,
    acumuladoTotal: 0,
    faltanteTotal: 0,
    progressoMedio: 0
  };
  metasDetalhe: {
    id: string;
    title: string;
    target: number;
    current: number;
    remaining: number;
    progress: number;
    status: GoalStatus;
    statusLabel: string;
    targetDateLabel: string | null;
    expectedMonthly: number;
  }[] = [];
  metasVisao: 'progresso' | 'aporte' = 'progresso';
  insight = {
    title: 'Tudo certo por aqui',
    message: 'Vamos manter esse ritmo com pequenos ajustes ao longo do mês.',
    tone: 'ok' as 'ok' | 'warn' | 'danger' | 'info'
  };
  insightAction: { label: string; route: string } | null = null;
  insightHighlights: string[] = [];
  insightPriority: InsightPriority = 'Estável';
  insightActionSentence = '';
  insightShortGoal = '';
  insightDeadlineLabel = '';
  insightComparison: string[] = [];
  insightChangesToday: string[] = [];
  insightTodoItems: InsightTodoItem[] = [];
  robotInsightTips: string[] = [];
  robotScoreBreakdown: string[] = [];
  engineInsightTips: string[] = [];
  insightDrillDown = {
    expensesRoute: '/despesas',
    expensesQuery: { focus: 'overdue' as const },
    incomesRoute: '/receitas',
    incomesQuery: { focus: 'pending' as const }
  };
  insightDiagnostics: InsightDiagnostics = {
    healthScore: 100,
    riskDayLabel: null,
    overdueExpensesCount: 0,
    overdueExpensesAmount: 0,
    overdueIncomesCount: 0,
    dueSoonExpensesAmount: 0,
    projectedBalance: 0,
    currentCoverage: 100,
    projectedCoverage: 100
  };
  financialGoal: string | null = null;
  onboardingStep = 0;
  onboardingDone = false;
  hideOnboarding = false;
  onboardingDismissed = false;
  onboardingLoaded = false;
  onboardingScreens = [
    {
      title: 'Cadastre sua primeira receita',
      description: 'Informe sua principal fonte para o app calcular seu saldo real.',
      bullets: ['Salário, freelas ou benefícios', 'Defina se é fixa ou avulsa'],
      ctaLabel: 'Cadastrar receita',
      ctaLink: '/receitas'
    },
    {
      title: 'Cadastre uma despesa',
      description: 'Registre seus gastos para acompanhar o que sai do caixa.',
      bullets: ['Escolha a categoria correta', 'Defina o vencimento'],
      ctaLabel: 'Cadastrar despesa',
      ctaLink: '/despesas'
    },
    {
      title: 'Crie sua meta anual',
      description: 'Tenha um objetivo claro e acompanhe o progresso.',
      bullets: ['Valor total e prazo', 'Aportes mensais previstos'],
      ctaLabel: 'Criar meta',
      ctaLink: '/metas'
    }
  ];
  showInsightDetails = false;
  private readonly expenseCategoryColors = ['var(--chart-1)', 'var(--chart-5)', 'var(--chart-2)', 'var(--chart-3)', 'var(--expense)', 'var(--chart-4)'];
  private readonly incomeSourceColors = ['var(--income)', 'var(--chart-5)', 'var(--chart-1)', 'var(--chart-4)', 'var(--chart-3)', 'var(--chart-2)'];

  constructor(
    private db: ApiDataService,
    private goalsService: GoalsService,
    private cardsService: CardsService,
    private onboardingService: OnboardingService,
    private accountsService: AccountsService,
    private authService: AuthService,
    private profileService: ProfileService,
    private notificationsService: NotificationsService,
    private financialAssistantService: FinancialAssistantService,
    private budgetService: BudgetService,
    private investmentsService: InvestmentsService,
    private router: Router,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.summaryRefresh$
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshSummaries());
    if (this.isLogged) {
      this.loadProfileSnapshot();
      this.onboardingService.getStatus().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (status) => {
          if (!status.completed) {
            this.router.navigateByUrl('/onboarding');
            return;
          }
          this.onboardingStep = Math.min(Math.max(status.step || 0, 0), 2);
          this.onboardingDone = !!status.completed;
          this.hideOnboarding = this.onboardingDone;
          this.onboardingLoaded = true;
        },
        error: () => {
          this.onboardingStep = 0;
          this.onboardingDone = false;
          this.hideOnboarding = false;
          this.onboardingLoaded = true;
        }
      });
      this.loadRobotInsightsSnapshot();
      this.setupDashboardRealtimeRefresh();
    }
    this.db.expenses$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.expensesLoaded = true;
      this.expensesRaw = lista;
      this.updatePeriodTotals();
      this.atualizarSaldo();
      this.updateCategoryCharts();
      this.atualizarDividaCartoes();
      this.updateRecentTransactions();
      this.updateMonthlyFlow();
      this.updateOverviewDerived();
      this.updateInsight();
      this.summaryRefresh$.next();
    });
    this.db.incomes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.incomesLoaded = true;
      this.incomesRaw = lista;
      this.updatePeriodTotals();
      this.atualizarSaldo();
      this.updateCategoryCharts();
      this.updateRecentTransactions();
      this.updateMonthlyFlow();
      this.updateOverviewDerived();
      this.updateInsight();
      this.summaryRefresh$.next();
    });
    this.db.cards$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.cards = lista;
    });
    if (this.isLogged) {
      this.loadAccountsSnapshot();
    }
    if (this.isLogged) {
      this.loadGoalsSnapshot();
      this.db.refresh(true);
    }
  }

  private setupDashboardRealtimeRefresh(): void {
    const visibilityChange$ = typeof document === 'undefined'
      ? EMPTY
      : fromEvent(document, 'visibilitychange');

    merge(interval(this.dashboardRealtimeRefreshMs), visibilityChange$)
      .pipe(
        filter(() => this.isLogged && !this.isDocumentHidden()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.refreshDashboardRealtimeData());
  }

  private refreshDashboardRealtimeData(): void {
    if (!this.isLogged || this.isDocumentHidden()) return;

    this.db.refresh(true);
    this.loadAccountsSnapshot();
    this.loadGoalsSnapshot();
    this.loadRobotInsightsSnapshot();
  }

  private isDocumentHidden(): boolean {
    return typeof document !== 'undefined' && document.hidden;
  }

  private loadProfileSnapshot(): void {
    this.profileService.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (profile) => {
        this.financialGoal = profile?.financialGoal || null;
        this.updateInsight();
      },
      error: () => {
        this.financialGoal = null;
      }
    });
  }

  private loadRobotInsightsSnapshot(): void {
    this.notificationsService.list(false, 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => this.consumeRobotInsight(items || []),
      error: () => {
        this.robotInsightTips = [];
      }
    });
  }

  private loadAccountsSnapshot(): void {
    this.accountsService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (accounts) => {
        this.accountBalances = (accounts || []).filter((a) => a.isActive);
        this.accountsService.resolveDefaultAccountId(this.accountBalances);
        this.refreshSummaries();
      },
      error: () => {
        this.accountBalances = [];
        this.realBalanceSummary = null;
        this.debtSummary = null;
        this.subscriptionsSummary = null;
        this.aiHealth = null;
        this.netWorthSummary = null;
        this.netWorthHistory = null;
        this.cashflowProjection = null;
        this.riskAssessment = null;
        this.insightEngine = null;
        this.recommendationEngine = null;
        this.budgetSummary = null;
        this.investmentPositions = [];
        this.registerLoadError('resumo de contas');
      }
    });
  }

  private loadGoalsSnapshot(): void {
    this.goalsService.list(this.dataAtual.getFullYear()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (goals) => this.atualizarMetas(goals),
      error: () => this.atualizarMetas([])
    });
  }

  get mesAtualLabel(): string {
    if (this.periodo === 'quarter') {
      const quarter = Math.floor(this.dataAtual.getMonth() / 3) + 1;
      const year = this.dataAtual.getFullYear();
      const primeiroMes = (quarter - 1) * 3;
      return `${formatMonthLabel(year, primeiroMes)} a ${formatMonthLabel(year, primeiroMes + 2)} de ${year}`;
    }
    if (this.periodo === 'year') {
      return `Ano de ${this.dataAtual.getFullYear()}`;
    }
    return formatMonthYearLabel(this.dataAtual);
  }

  get isLoadingDashboard(): boolean {
    return !(this.expensesLoaded && this.incomesLoaded);
  }

  get showOnboarding(): boolean {
    return this.onboardingLoaded && this.isLogged && !this.onboardingDone && !this.onboardingDismissed;
  }

  get onboardingCurrent() {
    return this.onboardingScreens[Math.min(this.onboardingStep, this.onboardingScreens.length - 1)];
  }

  get onboardingTotal(): number {
    return this.onboardingScreens.length;
  }

  get insightTips(): string[] {
    if (this.robotInsightTips.length > 0) {
      return this.robotInsightTips;
    }
    if (this.engineInsightTips.length > 0) {
      return this.engineInsightTips;
    }
    switch (this.insight.tone) {
      case 'danger':
        return [
          'Revise despesas com vencimento próximo',
          'Priorize cortar gastos variáveis',
          'Antecipe receitas se possível'
        ];
      case 'warn':
        return ['Acompanhe os gastos da semana', 'Evite novas compras parceladas', 'Defina um limite diário'];
      case 'info':
        return ['Cadastre receitas e despesas principais', 'Crie sua primeira meta anual'];
      default:
        return ['Mantenha o ritmo atual', 'Reavalie suas metas no fim do mês'];
    }
  }

  private consumeRobotInsight(items: NotificationItem[]): void {
    const latestInsight = items
      .filter((item) => item.kind === 'CashflowInsight')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!latestInsight) {
      this.latestRobotInsight = null;
      this.robotInsightTips = [];
      this.robotScoreBreakdown = [];
      return;
    }
    this.latestRobotInsight = latestInsight;
    this.robotInsightTips = this.extractRobotTips(latestInsight);
    this.robotScoreBreakdown = this.extractRobotScoreBreakdown(latestInsight);
    this.updateInsight();
  }

  private extractRobotTips(notification: NotificationItem): string[] {
    const payloadTips = notification.payload?.tips;
    if (Array.isArray(payloadTips) && payloadTips.length > 0) {
      return payloadTips.map((tip) => String(tip).trim()).filter(Boolean).slice(0, 4);
    }
    const message = notification.message || '';
    const match = message.match(/Dicas:\s*(.+)\.?$/i);
    if (!match?.[1]) return [];
    return match[1]
      .split('|')
      .map((tip) => tip.trim())
      .filter((tip) => tip.length > 0)
      .slice(0, 4);
  }

  private extractRobotScoreBreakdown(notification: NotificationItem): string[] {
    const breakdown = notification.payload?.scoreBreakdown;
    if (!Array.isArray(breakdown)) return [];
    return breakdown.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
  }

  private isRobotInsightFresh(notification: NotificationItem | null): boolean {
    if (!notification) return false;
    const createdAt = new Date(notification.createdAt);
    if (Number.isNaN(createdAt.getTime())) return false;
    const ageMs = Date.now() - createdAt.getTime();
    const maxAgeMs = 36 * 60 * 60 * 1000;
    return ageMs >= 0 && ageMs <= maxAgeMs;
  }

  private applyRobotInsight(notification: NotificationItem): void {
    const payload = notification.payload ?? null;
    const priority = payload?.priority ?? 'warning';
    const tone: 'ok' | 'warn' | 'danger' =
      priority === 'critical' ? 'danger' : priority === 'warning' ? 'warn' : 'ok';
    const highlights = [
      `Cobertura atual: ${(payload?.currentCoverage ?? this.insightDiagnostics.currentCoverage).toFixed(0)}%`,
      `Cobertura projetada: ${(payload?.projectedCoverage ?? this.insightDiagnostics.projectedCoverage).toFixed(0)}%`,
      `Saldo projetado: ${formatCurrency(payload?.projectedBalance ?? this.insightDiagnostics.projectedBalance)}`
    ];
    const firstRecommendation = payload?.recommendations?.[0];
    const action =
      firstRecommendation?.actionLabel && firstRecommendation?.route
        ? { label: firstRecommendation.actionLabel, route: firstRecommendation.route }
        : null;
    this.setInsight(notification.title, notification.message, tone, highlights, action);

    this.insightPriority =
      priority === 'critical' ? 'Crítico' : priority === 'warning' ? 'Atenção' : 'Estável';
    this.insightActionSentence = payload?.action || this.insightActionSentence;

    const recommendationItems = (payload?.recommendations || [])
      .map((item, index) => {
        const route = item.route || '/home';
        const queryParams = Object.entries(item.queryParams || {}).reduce<Record<string, string>>((acc, [k, v]) => {
          acc[k] = String(v);
          return acc;
        }, {});
        const severity: 'danger' | 'warn' | 'info' =
          item.severity === 'danger' || item.severity === 'warn' ? item.severity : 'info';
        return {
          id: item.id || `robot-${index + 1}`,
          severity,
          text: item.text || '',
          actionLabel: item.actionLabel || 'Ver detalhes',
          route,
          queryParams
        } as InsightTodoItem;
      })
      .filter((item) => item.text.length > 0)
      .slice(0, 4);

    if (recommendationItems.length > 0) {
      this.insightTodoItems = recommendationItems;
    }

    this.insightDiagnostics = {
      ...this.insightDiagnostics,
      healthScore: payload?.healthScore ?? this.insightDiagnostics.healthScore,
      riskDayLabel: payload?.riskDay
        ? new Date(`${payload.riskDay}T00:00:00`).toLocaleDateString('pt-BR')
        : this.insightDiagnostics.riskDayLabel,
      overdueExpensesCount: payload?.overdueExpenses ?? this.insightDiagnostics.overdueExpensesCount,
      overdueIncomesCount: payload?.overdueIncomes ?? this.insightDiagnostics.overdueIncomesCount,
      dueSoonExpensesAmount: payload?.dueSoonExpensesAmount ?? this.insightDiagnostics.dueSoonExpensesAmount,
      projectedBalance: payload?.projectedBalance ?? this.insightDiagnostics.projectedBalance,
      currentCoverage: payload?.currentCoverage ?? this.insightDiagnostics.currentCoverage,
      projectedCoverage: payload?.projectedCoverage ?? this.insightDiagnostics.projectedCoverage
    };
  }

  private applyRiskAssessment(): boolean {
    if (!this.riskAssessment) return false;

    this.insightPriority =
      this.riskAssessment.priority === 'critical'
        ? 'Crítico'
        : this.riskAssessment.priority === 'warning'
          ? 'Atenção'
          : 'Estável';

    this.insightDiagnostics = {
      ...this.insightDiagnostics,
      healthScore: this.riskAssessment.score,
      riskDayLabel: this.riskAssessment.riskDate
        ? new Date(`${this.riskAssessment.riskDate}T00:00:00`).toLocaleDateString('pt-BR')
        : null,
      projectedBalance: this.riskAssessment.projectedBalance,
      currentCoverage: this.riskAssessment.currentCoverage,
      projectedCoverage: this.riskAssessment.projectedCoverage
    };

    this.robotScoreBreakdown = this.riskAssessment.scoreBreakdown || [];
    this.insightTodoItems = (this.riskAssessment.recommendations || []).map((item) => ({
      id: item.id,
      severity: item.severity,
      text: item.text,
      actionLabel: item.actionLabel,
      route: item.route,
      queryParams: item.queryParams || {}
    }));
    return true;
  }

  private applyStructuredInsight(): boolean {
    const primary = this.insightEngine?.primaryInsight;
    if (!primary) return false;

    this.engineInsightTips = primary.tips || [];
    this.robotScoreBreakdown = primary.scoreBreakdown || this.robotScoreBreakdown;
    this.insightPriority =
      primary.priority === 'critical' ? 'Crítico' : primary.priority === 'warning' ? 'Atenção' : 'Estável';
    this.insightActionSentence = primary.action;
    this.insightShortGoal = resolveInsightShortGoal(primary);
    this.insightHighlights = primary.highlights || [];
    this.insightAction = this.resolveInsightAction(primary);
    this.insightTodoItems = this.resolveRecommendationTodoItems(primary.recommendations || []);
    this.insight = {
      title: primary.title,
      message: primary.message,
      tone: primary.priority === 'critical' ? 'danger' : primary.priority === 'warning' ? 'warn' : 'ok'
    };
    return true;
  }

  get insightHealthToneClass(): string {
    const score = this.insightDiagnostics.healthScore;
    if (score < 45) return 'text-[var(--expense-text)] bg-[var(--expense-tint)] border-[var(--expense-border)]';
    if (score < 70) return 'text-[var(--warning-text)] bg-[var(--warning-tint)] border-[var(--warning-border)]';
    return 'text-[var(--income-text)] bg-[var(--income-tint)] border-[var(--income-border)]';
  }

  get insightRiskToneClass(): string {
    if (this.insightDiagnostics.riskDayLabel) {
      return 'border-[var(--expense-border)] bg-[var(--expense-tint)] text-[var(--expense-text)]';
    }
    return 'border-[var(--income-border)] bg-[var(--income-tint)] text-[var(--income-text)]';
  }

  get insightOverdueToneClass(): string {
    const totalOverdue = this.insightDiagnostics.overdueExpensesCount + this.insightDiagnostics.overdueIncomesCount;
    if (totalOverdue > 0) {
      return 'border-[var(--expense-border)] bg-[var(--expense-tint)] text-[var(--expense-text)]';
    }
    return 'border-[var(--neutral-border)] bg-[var(--neutral-tint)] text-[var(--text-secondary)]';
  }

  get insightProjectedToneClass(): string {
    if (this.insightDiagnostics.projectedBalance < 0) {
      return 'border-[var(--expense-border)] bg-[var(--expense-tint)] text-[var(--expense-text)]';
    }
    return 'border-[var(--primary-border)] bg-[var(--primary-tint)] text-[var(--primary-text)]';
  }

  get insightPriorityClass(): string {
    if (this.insightPriority === 'Crítico') return 'border-[var(--expense-border)] bg-[var(--expense-tint)] text-[var(--expense-text)]';
    if (this.insightPriority === 'Atenção') return 'border-[var(--warning-border)] bg-[var(--warning-tint)] text-[var(--warning-text)]';
    return 'border-[var(--income-border)] bg-[var(--income-tint)] text-[var(--income-text)]';
  }

  get insightScoreGaugeWidth(): number {
    return Math.max(0, Math.min(100, this.insightDiagnostics.healthScore));
  }

  get coberturaDespesasPercentual(): number {
    if (this.totalDespesas <= 0) return 100;
    return (this.saldoBaseDisponivel / this.totalDespesas) * 100;
  }

  get saldoProjetadoComPendencias(): number {
    return this.saldoPrincipal + this.totalRendasPendentes;
  }

  get cardsCount(): number {
    return this.cards.length;
  }

  get saldoDisponivelReal(): number {
    return this.realBalanceSummary?.realAvailableBalance ?? (this.totalSaldoContas - this.totalDespesasEmAberto);
  }

  get saldoDisponivelProjetado(): number {
    return this.realBalanceSummary?.projectedAvailableBalance ?? (this.totalSaldoContas - this.totalDespesasEmAberto + this.totalRendasPendentes);
  }

  get pendenciasCaixa(): number {
    return this.realBalanceSummary?.pendingExpensesAmount ?? this.totalDespesasEmAberto;
  }

  get patrimonioLiquido(): number {
    return this.netWorthSummary?.netWorth ?? (this.totalSaldoContas - this.totalDividaCartoes);
  }

  get patrimonioTotalAtivos(): number {
    return this.netWorthSummary?.assets.totalAssets ?? this.totalSaldoContas;
  }

  get patrimonioEmInvestimentos(): number {
    return this.netWorthSummary?.assets.investmentsBalance ?? 0;
  }

  get patrimonioEmAtivosReais(): number {
    return this.netWorthSummary?.assets.tangibleAssetsBalance ?? 0;
  }

  get patrimonioPassivos(): number {
    return this.netWorthSummary?.liabilities.totalLiabilities ?? this.debtSummary?.totalDebt ?? this.totalDividaCartoes;
  }

  get dashboardAccountsDebtAvailable(): boolean {
    return !!this.realBalanceSummary || this.accountBalances.length > 0 || this.dashboardDebtTotal > 0 || this.dashboardDebtItems.length > 0;
  }

  get dashboardAccountsBalance(): number {
    return this.realBalanceSummary?.activeAccountsBalance ?? this.totalSaldoContas;
  }

  get dashboardRealAvailableBalance(): number {
    return this.realBalanceSummary?.realAvailableBalance ?? this.saldoDisponivelReal;
  }

  get dashboardDebtTotal(): number {
    return this.debtSummary?.totalDebt ?? this.totalDividaCartoes;
  }

  get dashboardDebtOverdueTotal(): number {
    return this.debtSummary?.overdueDebt ?? 0;
  }

  get dashboardDebtDueSoonTotal(): number {
    return this.debtSummary?.dueSoonDebt ?? 0;
  }

  get dashboardDebtOpenItemsCount(): number {
    return this.debtSummary?.openItemsCount ?? (this.totalDividaCartoes > 0 ? 1 : 0);
  }

  get dashboardDebtItems(): DashboardDebtItem[] {
    return (this.debtSummary?.nextItems || []).slice(0, 3).map((item): DashboardDebtItem => ({
      id: item.installmentId || item.planId,
      title: item.title || 'Compromisso em aberto',
      amount: item.openAmount || item.originalAmount || 0,
      dateLabel: this.formatCompactIsoDate(item.dueDate),
      kindLabel: item.family === 'card' ? (item.relatedName ? `Cartão · ${item.relatedName}` : 'Cartão') : 'Dívida',
      tone: this.debtItemTone(item.status)
    }));
  }

  get dashboardTopAccounts(): AccountResponse[] {
    return [...this.accountBalances]
      .sort((a, b) => Math.abs(b.currentBalance || 0) - Math.abs(a.currentBalance || 0))
      .slice(0, 3);
  }

  get investmentsOverview(): InvestmentsOverview {
    return buildInvestmentsOverview(this.investmentPositions, this.dataAtual);
  }

  get hasInvestmentDashboardData(): boolean {
    return this.investmentsOverview.marketValue > 0 || this.investmentsOverview.activeCount > 0;
  }

  get investmentTopDistribution() {
    return this.investmentsOverview.distribution.slice(0, 3);
  }

  get investmentResultTone(): 'success' | 'warning' | 'danger' | 'muted' {
    const result = this.investmentsOverview.growth;
    if (result > 0) return 'success';
    if (result < 0) return 'danger';
    return 'muted';
  }

  get hasAiHealthAreas(): boolean {
    return Array.isArray(this.aiHealth?.areas) && this.aiHealth.areas.length > 0;
  }

  get patrimonioHistoryPoints() {
    return this.netWorthHistory?.points || [];
  }

  get controleFlowSeries(): MonthlyFlowPoint[] {
    return buildMonthlyFlowSeries(this.expensesRaw, this.incomesRaw, this.dataAtual, CONTROLE_FLOW_MONTHS);
  }

  get budgetOverview(): BudgetOverview {
    return buildBudgetOverview(this.budgetSummary);
  }

  get budgetItemHighlights(): BudgetItemView[] {
    return buildBudgetItemViews(this.budgetSummary)
      .filter((view) => view.item.realizedAmount > 0 || view.overBudget)
      .sort((a, b) => {
        if (a.overBudget !== b.overBudget) return a.overBudget ? -1 : 1;
        return b.usagePercent - a.usagePercent;
      })
      .slice(0, 3);
  }

  get recurrenceItems(): DashboardRecurrenceItem[] {
    return this.allRecurrenceItems.slice(0, 6);
  }

  get allRecurrenceItems(): DashboardRecurrenceItem[] {
    const currentMonthKey = `${this.dataAtual.getFullYear()}-${String(this.dataAtual.getMonth() + 1).padStart(2, '0')}`;
    const expenseItems: DashboardRecurrenceItem[] = this.expensesRaw
      .filter((expense) => monthKeyFromLocaleDate(expense.vencimento) === currentMonthKey)
      .filter((expense) => this.isRecurringExpense(expense))
      .map((expense): DashboardRecurrenceItem => ({
        id: `expense-${expense.id}`,
        title: expense.nome || 'Despesa recorrente',
        amount: expense.valor || 0,
        dateLabel: this.formatCompactLocaleDate(expense.vencimento),
        kindLabel: this.recurringExpenseKindLabel(expense),
        tone: isExpenseOpen(expense.status) ? 'warning' : 'muted',
        direction: 'expense' as const
      }));
    const incomeItems: DashboardRecurrenceItem[] = this.incomesRaw
      .filter((income) => monthKeyFromLocaleDate(income.recebimento) === currentMonthKey)
      .filter((income) => !!income.fixa)
      .map((income): DashboardRecurrenceItem => ({
        id: `income-${income.id}`,
        title: income.fonte || 'Receita recorrente',
        amount: income.valor || 0,
        dateLabel: this.formatCompactLocaleDate(income.recebimento),
        kindLabel: 'Receita fixa',
        tone: isIncomeReceived(income.status) ? 'success' : 'info',
        direction: 'income' as const
      }));

    return [...expenseItems, ...incomeItems]
      .sort((a, b) => {
        const directionOrder = a.direction === b.direction ? 0 : a.direction === 'expense' ? -1 : 1;
        if (directionOrder !== 0) return directionOrder;
        return b.amount - a.amount;
      });
  }

  get recurrenceOutflowTotal(): number {
    return this.allRecurrenceItems
      .filter((item) => item.direction === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get recurrenceIncomeTotal(): number {
    return this.allRecurrenceItems
      .filter((item) => item.direction === 'income')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get recurrenceExpenseCount(): number {
    return this.allRecurrenceItems.filter((item) => item.direction === 'expense').length;
  }

  get recurrenceIncomeCount(): number {
    return this.allRecurrenceItems.filter((item) => item.direction === 'income').length;
  }

  private isRecurringExpense(expense: StoredExpense): boolean {
    return !!expense.fixa || !!expense.serieId || (!!expense.parcelasTotal && expense.parcelasTotal > 1);
  }

  private recurringExpenseKindLabel(expense: StoredExpense): string {
    const category = (expense.categoria || '').toLowerCase();
    if (category.includes('assinatura')) return 'Assinatura';
    if (expense.parcelasTotal && expense.parcelasTotal > 1) {
      return `Parcela ${expense.parcelaNumero || 1}/${expense.parcelasTotal}`;
    }
    return 'Conta fixa';
  }

  get patrimonioChartYearLabel(): string {
    return String(this.dataAtual.getFullYear());
  }

  get periodoContextoDashboard(): FinancialOverviewInput['periodoContexto'] {
    switch (this.periodo) {
      case 'quarter':
        return {
          nome: 'trimestre',
          nomeComArtigo: 'no trimestre',
          detalheReceitas: 'A receber no trimestre',
          detalheDespesas: 'A pagar no trimestre',
          detalheProjetado: 'Projetado no trimestre'
        };
      case 'year':
        return {
          nome: 'ano',
          nomeComArtigo: 'no ano',
          detalheReceitas: 'A receber no ano',
          detalheDespesas: 'A pagar no ano',
          detalheProjetado: 'Projetado no ano'
        };
      default:
        return {
          nome: 'mês',
          nomeComArtigo: 'no mês',
          detalheReceitas: 'A receber no mês',
          detalheDespesas: 'A pagar no mês',
          detalheProjetado: 'Projetado no mês'
        };
    }
  }

  get patrimonioHistoryDelta(): number {
    return netWorthDelta(this.patrimonioPeriodHistoryPoints);
  }

  get patrimonioPeriodHistoryPoints() {
    const range = this.getPeriodRange();
    return this.patrimonioHistoryPoints.filter((point) => {
      const key = point.referenceDate.slice(0, 7);
      return this.isWithinRange(key, range);
    });
  }

  get saldoDelta(): number {
    return this.saldoPrincipal - this.saldoAnterior;
  }

  get patrimonioHistoryEstimated(): boolean {
    return !!this.netWorthHistory?.hasEstimatedPoints;
  }

  private get patrimonioPeriodFlowSeries(): MonthlyFlowPoint[] {
    const range = this.getPeriodRange();
    return this.monthlyFlowSeries.filter((point) => this.isWithinRange(point.key, range));
  }

  get projectionHighlights(): Array<{
    dateLabel: string;
    incomesAmount: number;
    expensesAmount: number;
    closingBalance: number;
    tone: 'danger' | 'warn' | 'ok';
  }> {
    return (this.cashflowProjection?.points || []).slice(0, 7).map((point) => {
      const date = new Date(`${point.date}T00:00:00`);
      const tone: 'danger' | 'warn' | 'ok' =
        point.closingBalance < 0 ? 'danger' : point.expensesAmount > point.incomesAmount ? 'warn' : 'ok';
      return {
        dateLabel: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        incomesAmount: point.incomesAmount,
        expensesAmount: point.expensesAmount,
        closingBalance: point.closingBalance,
        tone
      };
    });
  }

  get totalSaldoContas(): number {
    return this.accountBalances.reduce((sum, item) => sum + (item.currentBalance || 0), 0);
  }

  get saldoPrincipal(): number {
    return this.saldoAnterior + this.totalRendas - this.totalDespesas;
  }

  get saldoBaseDisponivel(): number {
    return Math.max(this.saldoAnterior + this.totalRendas, 0);
  }

  get currentRole(): UserRole | null {
    return this.authService.getRole();
  }

  get isBasicProfile(): boolean {
    return this.currentRole === 'Basic';
  }

  get incomeEntriesCount(): number {
    return this.incomesRaw.length;
  }

  get expenseEntriesCount(): number {
    return this.expensesRaw.length;
  }

  get hasCardEntries(): boolean {
    return this.cards.length > 0;
  }


  hasAccess(minRole: UserRole): boolean {
    return hasAtLeastRole(this.currentRole, minRole);
  }

  private atualizarDividaCartoes(): void {
    this.cardsService.debtTotal().subscribe({
      next: ({ total }) => {
        this.totalDividaCartoes = total ?? 0;
        this.updateInsight();
      },
      error: () => {}
    });
  }

  get isLogged(): boolean {
    return this.authService.isAuthenticated();
  }

  private atualizarSaldo(): void {
    const range = this.getPeriodRange();
    this.saldoAnterior = this.calcularSaldoAnterior(range);
    this.saldo = this.saldoPrincipal;
  }

  private updatePeriodTotals(): void {
    this.totalDespesas = this.somarDespesasMes(this.expensesRaw);
    this.totalDespesasPagas = this.somarDespesasPagasMes(this.expensesRaw);
    this.totalDespesasEmAberto = this.somarDespesasEmAbertoMes(this.expensesRaw);
    this.totalRendas = this.somarRendasMes(this.incomesRaw);
    this.totalRendasPendentes = this.somarRendasPendentesMes(this.incomesRaw);
  }

  private isDateInRange(date: string, range: { startKey: string; endKey: string }): boolean {
    const key = monthKeyFromLocaleDate(date);
    return key ? this.isWithinRange(key, range) : false;
  }

  private somarDespesasMes(
    lista: StoredExpense[],
    range: { startKey: string; endKey: string } = this.getPeriodRange()
  ): number {
    return lista
      .filter((d) => this.isDateInRange(d.vencimento, range))
      .reduce((sum, d) => sum + (d.valor || 0), 0);
  }

  private somarDespesasPagasMes(
    lista: StoredExpense[],
    range: { startKey: string; endKey: string } = this.getPeriodRange()
  ): number {
    return lista
      .filter((d) => this.isDateInRange(d.vencimento, range) && !isExpenseOpen(d.status))
      .reduce((sum, d) => sum + (d.valor || 0), 0);
  }

  private somarDespesasEmAbertoMes(
    lista: StoredExpense[],
    range: { startKey: string; endKey: string } = this.getPeriodRange()
  ): number {
    return lista
      .filter((d) => this.isDateInRange(d.vencimento, range) && isExpenseOpen(d.status))
      .reduce((sum, d) => sum + (d.valor || 0), 0);
  }

  private somarRendasMes(
    lista: StoredIncome[],
    range: { startKey: string; endKey: string } = this.getPeriodRange()
  ): number {
    return lista
      .filter((r) => this.isDateInRange(r.recebimento, range) && isIncomeReceived(r.status))
      .reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  private somarRendasPendentesMes(
    lista: StoredIncome[],
    range: { startKey: string; endKey: string } = this.getPeriodRange()
  ): number {
    return lista
      .filter((r) => this.isDateInRange(r.recebimento, range) && isIncomePending(r.status))
      .reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  private calcularSaldoAnterior(range: { startKey: string; endKey: string }): number {
    const receitasRecebidasAntes = this.incomesRaw
      .filter((r) => this.isBeforeRange(r.recebimento, range) && isIncomeReceived(r.status))
      .reduce((sum, r) => sum + (r.valor || 0), 0);
    const despesasAntes = this.expensesRaw
      .filter((d) => this.isBeforeRange(d.vencimento, range))
      .reduce((sum, d) => sum + (d.valor || 0), 0);
    return receitasRecebidasAntes - despesasAntes;
  }

  private isBeforeRange(date: string, range: { startKey: string; endKey: string }): boolean {
    const key = monthKeyFromLocaleDate(date);
    return !!key && key < range.startKey;
  }

  private updateCategoryCharts(): void {
    const range = this.getPeriodRange();
    const expenses = this.expensesRaw.filter((d) => this.isDateInRange(d.vencimento, range));
    const incomes = this.incomesRaw.filter((r) => this.isDateInRange(r.recebimento, range));

    const groupByLabel = <T extends { valor: number }>(
      items: T[],
      labelGetter: (item: T) => string
    ): { label: string; total: number }[] => {
      const map = new Map<string, number>();
      for (const item of items) {
        const label = labelGetter(item).trim() || 'Sem categoria';
        map.set(label, (map.get(label) || 0) + (item.valor || 0));
      }
      return Array.from(map.entries())
        .map(([label, total]) => ({ label, total }))
        .sort((a, b) => b.total - a.total);
    };

    const cap = (items: { label: string; total: number }[], limit = 6) => {
      if (items.length <= limit) return items;
      const head = items.slice(0, limit - 1);
      const rest = items.slice(limit - 1).reduce((sum, item) => sum + item.total, 0);
      return [...head, { label: 'Outros', total: rest }];
    };

    const toTotalsMap = (items: { label: string; total: number }[]): Map<string, number> =>
      new Map(items.map((item) => [item.label, item.total]));

    const prevRange = this.getPreviousPeriodRange();
    const prevExpenses = this.expensesRaw.filter((d) => this.isDateInRange(d.vencimento, prevRange));
    const prevIncomes = this.incomesRaw.filter((r) => this.isDateInRange(r.recebimento, prevRange));
    const prevExpenseByLabel = toTotalsMap(groupByLabel(prevExpenses, (d) => d.categoria || 'Sem categoria'));
    const prevIncomeByLabel = toTotalsMap(groupByLabel(prevIncomes, (r) => r.categoria || 'Sem categoria'));

    const expenseData = cap(groupByLabel(expenses, (d) => d.categoria || 'Sem categoria'));
    const incomeData = cap(groupByLabel(incomes, (r) => r.categoria || 'Sem categoria'));

    this.expenseCategoryTotal = expenseData.reduce((sum, item) => sum + item.total, 0);
    this.expenseCategorySlices = expenseData.map((item, index) =>
      this.toCategorySlice(item, index, this.expenseCategoryTotal, this.expenseCategoryColors, prevExpenseByLabel)
    );
    this.incomeSourceTotal = incomeData.reduce((sum, item) => sum + item.total, 0);
    this.incomeSourceSlices = incomeData.map((item, index) =>
      this.toCategorySlice(item, index, this.incomeSourceTotal, this.incomeSourceColors, prevIncomeByLabel)
    );
  }

  private toCategorySlice(
    item: { label: string; total: number },
    index: number,
    total: number,
    palette: string[],
    previousByLabel: Map<string, number>
  ): CategorySlice {
    // "Outros" agrega categorias diferentes entre períodos — não é comparável.
    const previousTotal = item.label === 'Outros' ? null : previousByLabel.get(item.label) ?? null;
    return {
      label: item.label,
      total: item.total,
      percent: total > 0 ? (item.total / total) * 100 : 0,
      color: palette[index % palette.length],
      previousTotal
    };
  }

  private updateMonthlyFlow(): void {
    const range = this.getPeriodRange();
    const reference = rangeEndDate(range.endKey);
    this.monthlyFlowSeries = buildMonthlyFlowSeries(
      this.expensesRaw,
      this.incomesRaw,
      reference,
      this.periodMonthsCount()
    );
  }

  private periodMonthsCount(): number {
    if (this.periodo === 'year') return 12;
    if (this.periodo === 'quarter') return 3;
    return 1;
  }

  private formatCompactLocaleDate(value: string): string {
    const parsed = parseLocaleDate(value);
    return parsed ? parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : value;
  }

  private formatCompactIsoDate(value: string): string {
    const parsed = value ? new Date(`${value.slice(0, 10)}T00:00:00`) : null;
    return parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : value;
  }

  private debtItemTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
    const normalized = (status || '').toLowerCase();
    if (normalized.includes('overdue') || normalized.includes('atras')) return 'danger';
    if (normalized.includes('open') || normalized.includes('pending') || normalized.includes('abert')) return 'warning';
    if (normalized.includes('paid') || normalized.includes('pago')) return 'muted';
    return 'info';
  }

  /**
   * Deriva os dados da Visão Geral Financeira que dependem das listas cruas:
   * totais do período anterior (comparativos) e compromissos em aberto.
   * Comparativo fica `null` quando não há lançamentos no período anterior.
   */
  private updateOverviewDerived(): void {
    const prevRange = this.getPreviousPeriodRange();
    const hasPrevExpenses = this.expensesRaw.some((d) => this.isDateInRange(d.vencimento, prevRange));
    const hasPrevIncomes = this.incomesRaw.some((r) => this.isDateInRange(r.recebimento, prevRange));
    this.despesasPeriodoAnterior = hasPrevExpenses ? this.somarDespesasMes(this.expensesRaw, prevRange) : null;
    this.receitasPeriodoAnterior = hasPrevIncomes
      ? this.somarRendasMes(this.incomesRaw, prevRange) + this.somarRendasPendentesMes(this.incomesRaw, prevRange)
      : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seteDias = new Date(today);
    seteDias.setDate(seteDias.getDate() + 7);

    let emAtraso = 0;
    let proximosSeteDias = 0;
    let valorEmAberto = 0;
    // Separados porque o card "Precisa da sua atenção" trata os dois casos como
    // pendências diferentes: o que venceu tem ação de pagar, o que vai vencer não.
    let valorEmAtraso = 0;
    let valorProximos = 0;
    let maisAntigoEmAtraso: Date | null = null;
    for (const expense of this.expensesRaw) {
      if (!isExpenseOpen(expense.status)) continue;
      const due = parseLocaleDate(expense.vencimento);
      if (!due || due > seteDias) continue;
      const valor = expense.valor || 0;
      if (due < today) {
        emAtraso += 1;
        valorEmAtraso += valor;
        if (!maisAntigoEmAtraso || due < maisAntigoEmAtraso) maisAntigoEmAtraso = due;
      } else {
        proximosSeteDias += 1;
        valorProximos += valor;
      }
      valorEmAberto += valor;
    }

    let receitasAtrasadasQtd = 0;
    let receitasAtrasadasValor = 0;
    for (const income of this.incomesRaw) {
      if (!isIncomePending(income.status)) continue;
      const due = parseLocaleDate(income.recebimento);
      if (!due || due >= today) continue;
      receitasAtrasadasQtd += 1;
      receitasAtrasadasValor += income.valor || 0;
    }

    const diasDoMaisAntigo = maisAntigoEmAtraso
      ? Math.round((today.getTime() - maisAntigoEmAtraso.getTime()) / 86_400_000)
      : null;

    this.compromissosResumo = { emAtraso, proximosSeteDias, valorEmAberto };
    this.pendenciasDetalhadas = {
      despesasEmAtraso: { quantidade: emAtraso, valor: valorEmAtraso, diasDoMaisAntigo },
      despesasProximas: { quantidade: proximosSeteDias, valor: valorProximos },
      receitasAtrasadas: { quantidade: receitasAtrasadasQtd, valor: receitasAtrasadasValor },
      // Fatura de cartão ainda não tem data de fechamento no dashboard; enquanto
      // não tiver, o item não aparece em vez de aparecer com número inventado.
      faturasFechando: { quantidade: 0, valor: 0 }
    };
  }

  private getPreviousPeriodRange(): { startKey: string; endKey: string } {
    const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (this.periodo === 'year') {
      const ano = this.dataAtual.getFullYear() - 1;
      return { startKey: `${ano}-01`, endKey: `${ano}-12` };
    }
    if (this.periodo === 'quarter') {
      const quarterStartMonth = Math.floor(this.dataAtual.getMonth() / 3) * 3;
      const start = new Date(this.dataAtual.getFullYear(), quarterStartMonth - 3, 1);
      const end = new Date(this.dataAtual.getFullYear(), quarterStartMonth - 1, 1);
      return { startKey: monthKey(start), endKey: monthKey(end) };
    }
    const prev = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
    return { startKey: monthKey(prev), endKey: monthKey(prev) };
  }

  get overviewData(): FinancialOverviewInput {
    return {
      periodoContexto: this.periodoContextoDashboard,
      saldoPeriodo: this.saldo,
      saldoDisponivel: this.saldoDisponivelReal,
      saldoEmContas: this.totalSaldoContas,
      pendencias: this.pendenciasCaixa,
      saldoProjetado: this.saldoDisponivelProjetado,
      receitas: {
        total: this.totalRendas,
        pendentes: this.totalRendasPendentes,
        anterior: this.receitasPeriodoAnterior
      },
      despesas: {
        total: this.totalDespesas,
        pagas: this.totalDespesasPagas,
        emAberto: this.totalDespesasEmAberto,
        anterior: this.despesasPeriodoAnterior
      },
      patrimonio: {
        liquido: this.patrimonioLiquido,
        ativos: this.patrimonioTotalAtivos,
        passivos: this.patrimonioPassivos,
        investimentos: this.patrimonioEmInvestimentos,
        delta: this.patrimonioPeriodHistoryPoints.length > 1 ? this.patrimonioHistoryDelta : null
      },
      compromissos: {
        ...this.compromissosResumo,
        dividaCartoes: this.totalDividaCartoes,
        temCartoes: this.hasCardEntries
      },
      saude: this.aiHealth
        ? {
            status: this.aiHealth.overallStatus,
            resumo: this.aiHealth.overallSummary,
            // O índice vem do robô de risco, o mesmo que alimenta o painel de
            // insights — dois cálculos diferentes na mesma tela dariam notas
            // diferentes para a mesma conta.
            score: this.insightScoreGaugeWidth,
            fatores: this.aiHealth.areas.map((area) => ({
              rotulo: this.aiHealthAreaLabel(area.area),
              status: area.status,
              explicacao: area.explanation
            }))
          }
        : null
    };
  }

  /** Primeiro nome para a saudação do dashboard. Vazio quando não há nome salvo. */
  get userName(): string {
    return this.authService.getUserName();
  }

  /**
   * Série do card de evolução. A janela vem do perfil — 12 meses no Patrimônio,
   * 6 no Controle (PERFIS_E_PERMISSOES.md) — e o patrimônio líquido só entra
   * onde existe histórico para ele.
   */
  get evolutionData(): EvolutionInput {
    const patrimonio = this.hasAccess('Advanced');
    const historyByKey = new Map(
      this.patrimonioPeriodHistoryPoints.map((point) => [point.referenceDate.slice(0, 7), point])
    );
    const flow = patrimonio ? this.monthlyFlowSeries : this.controleFlowSeries;

    return {
      months: flow.map((point) => ({
        label: (point.label || '').replace('.', ''),
        income: point.income || 0,
        expense: point.expense || 0,
        netWorth: patrimonio ? historyByKey.get(point.key)?.netWorth ?? null : null
      })),
      sobra: this.saldo,
      patrimonioDeltaPct: this.patrimonioDeltaPercentual
    };
  }

  /** Variação do patrimônio no período, em porcentagem da posição anterior. */
  private get patrimonioDeltaPercentual(): number | null {
    if (this.patrimonioPeriodHistoryPoints.length <= 1) {
      return null;
    }
    const delta = this.patrimonioHistoryDelta;
    const anterior = this.patrimonioLiquido - delta;
    if (anterior <= 0) {
      return null;
    }
    return (delta / anterior) * 100;
  }

  get hasEvolutionData(): boolean {
    return this.evolutionData.months.filter((m) => m.income > 0 || m.expense > 0).length >= 2;
  }

  /** Agenda dos próximos 7 dias: despesas a vencer e receitas a receber. */
  get upcomingEntries(): UpcomingEntry[] {
    // `flatMap` em vez de `map().filter()`: lançamento sem data legível
    // simplesmente não entra na agenda, e o tipo sai sem `Date | null`.
    const despesas = this.expensesRaw.flatMap<UpcomingEntry>((e) => {
      if (!isExpenseOpen(e.status)) return [];
      const date = parseLocaleDate(e.vencimento);
      if (!date) return [];
      return [{
        id: `despesa-${e.id}`,
        name: e.nome || 'Despesa',
        date,
        amount: e.valor || 0,
        kind: 'expense',
        context: e.categoria || ''
      }];
    });

    const receitas = this.incomesRaw.flatMap<UpcomingEntry>((r) => {
      if (!isIncomePending(r.status)) return [];
      const date = parseLocaleDate(r.recebimento);
      if (!date) return [];
      return [{
        id: `receita-${r.id}`,
        name: r.fonte || 'Receita',
        date,
        amount: r.valor || 0,
        kind: 'income',
        context: r.categoria || ''
      }];
    });

    return [...despesas, ...receitas];
  }

  get hoje(): Date {
    return this.dataAtual;
  }

  /** Recorrências do mês, no contrato do card. */
  get recurrenceEntries(): RecurrenceEntry[] {
    const mesAtual = `${this.dataAtual.getFullYear()}-${String(this.dataAtual.getMonth() + 1).padStart(2, '0')}`;

    const despesas = this.expensesRaw.flatMap<RecurrenceEntry>((e) => {
      if (monthKeyFromLocaleDate(e.vencimento) !== mesAtual || !this.isRecurringExpense(e)) return [];
      const due = parseLocaleDate(e.vencimento);
      return [{
        id: `expense-${e.id}`,
        title: e.nome || 'Despesa recorrente',
        amount: e.valor || 0,
        direction: 'expense',
        day: due ? due.getDate() : null,
        category: e.categoria || '',
        settled: !isExpenseOpen(e.status)
      }];
    });

    const receitas = this.incomesRaw.flatMap<RecurrenceEntry>((r) => {
      if (monthKeyFromLocaleDate(r.recebimento) !== mesAtual || !r.fixa) return [];
      const due = parseLocaleDate(r.recebimento);
      return [{
        id: `income-${r.id}`,
        title: r.fonte || 'Receita recorrente',
        amount: r.valor || 0,
        direction: 'income',
        day: due ? due.getDate() : null,
        category: r.categoria || '',
        settled: isIncomeReceived(r.status)
      }];
    });

    return [...despesas, ...receitas];
  }

  /**
   * Rótulo curto do período, para o canto do card de categorias. O ano já está
   * no eyebrow do topo da tela; repeti-lo aqui só rouba largura do título.
   */
  get periodoCurtoLabel(): string {
    if (this.periodo === 'year') {
      return String(this.dataAtual.getFullYear());
    }
    if (this.periodo === 'quarter') {
      return `${Math.floor(this.dataAtual.getMonth() / 3) + 1}º trimestre`;
    }
    return this.mesAtualLabel.replace(/ de \d{4}$/, '');
  }

  /** Fatias de despesa por categoria, no contrato do card. */
  get spendSlices(): SpendSlice[] {
    return this.expenseCategorySlices.map((slice) => ({
      label: slice.label,
      total: slice.total,
      percent: slice.percent,
      color: slice.color
    }));
  }

  /**
   * Últimos lançamentos, no contrato do card. O detalhe da linha usa a
   * categoria, e não o status: "Alimentação" diz mais sobre o lançamento do que
   * "Pago", que já está implícito num extrato do que aconteceu.
   */
  get activityItems(): ActivityItem[] {
    return this.recentTransactions.map((t) => ({
      id: t.id,
      title: t.title,
      dateLabel: this.formatCompactLocaleDate(t.date),
      context: t.category || '',
      amount: t.amount,
      type: t.type
    }));
  }

  /** Metas, no contrato do card. */
  get goalEntries(): GoalEntry[] {
    return this.goalsRaw.map((g) => ({
      id: g.id,
      title: g.title,
      target: g.targetAmount || 0,
      current: g.currentAmount || 0,
      startDate: g.startDate ?? null,
      targetDate: g.targetDate ?? null,
      canceled: g.status === 'Canceled'
    }));
  }

  get insightObservations(): string[] {
    const observations = [...this.insightHighlights, ...this.insightChangesToday];
    return observations.slice(0, 6);
  }

  registerLoadError(section: string): void {
    this.loadErrorSections.add(section);
  }

  get loadErrorMessage(): string | null {
    if (this.loadErrorsDismissed || this.loadErrorSections.size === 0) return null;
    const sections = Array.from(this.loadErrorSections).join(', ');
    return `Não foi possível carregar: ${sections}. Verifique sua conexão e recarregue a página.`;
  }

  dismissLoadErrors(): void {
    this.loadErrorsDismissed = true;
  }

  private updateRecentTransactions(): void {
    const expenseItems = this.expensesRaw.map((e) => ({
      id: e.id,
      title: e.nome || 'Despesa',
      date: e.vencimento || '—',
      amount: e.valor || 0,
      type: 'expense' as const,
      // Mesmo status derivado das telas de lançamento: sem a data, uma despesa
      // vencida apareceria como "Em aberto" aqui e "Atrasada" lá.
      category: e.categoria || '',
      status: expenseStatusLabel(resolveInstallmentStatus(e.status, e.vencimento)),
      statusTone: installmentStatusTone(resolveInstallmentStatus(e.status, e.vencimento)),
      recurring: !!e.fixa,
      planId: e.planId
    }));
    const incomeItems = this.incomesRaw.map((i) => ({
      id: i.id,
      title: i.fonte || 'Receita',
      date: i.recebimento || '—',
      amount: i.valor || 0,
      type: 'income' as const,
      category: i.categoria || '',
      status: incomeStatusLabel(resolveInstallmentStatus(i.status, i.recebimento)),
      statusTone: installmentStatusTone(resolveInstallmentStatus(i.status, i.recebimento)),
      recurring: !!i.fixa,
      planId: i.planId
    }));

    const merged = [...expenseItems, ...incomeItems];
    const grouped = new Map<string, (typeof merged)[number]>();

    for (const item of merged) {
      const keyBase = item.recurring ? item.planId || item.title : item.id;
      const key = `${item.type}-${keyBase}`;
      const prev = grouped.get(key);
      if (!prev) {
        grouped.set(key, item);
        continue;
      }
      const prevDate = parseLocaleDate(prev.date)?.getTime() || 0;
      const nextDate = parseLocaleDate(item.date)?.getTime() || 0;
      if (nextDate >= prevDate) {
        grouped.set(key, item);
      }
    }

    const range = this.getPeriodRange();
    const all = Array.from(grouped.values()).filter((item) => {
      return this.isDateInRange(item.date, range);
    });
    all.sort((a, b) => {
      const da = parseLocaleDate(a.date)?.getTime() || 0;
      const db = parseLocaleDate(b.date)?.getTime() || 0;
      return db - da;
    });
    const slice = all.slice(0, 6).map((item) => ({
      ...item,
      date: this.formatCompactLocaleDate(item.date)
    }));
    this.recentTransactions = slice;
  }

  nextOnboarding(): void {
    if (this.onboardingStep >= this.onboardingScreens.length - 1) {
      this.finishOnboarding();
      return;
    }
    this.onboardingStep += 1;
    this.persistOnboarding();
  }

  prevOnboarding(): void {
    if (this.onboardingStep <= 0) return;
    this.onboardingStep -= 1;
    this.persistOnboarding();
  }

  skipOnboarding(): void {
    this.finishOnboarding();
  }

  dismissOnboarding(): void {
    this.onboardingDismissed = true;
  }

  openInsightDetails(): void {
    this.showInsightDetails = true;
  }

  closeInsightDetails(): void {
    this.showInsightDetails = false;
  }

  toggleHideOnboarding(checked: boolean): void {
    this.hideOnboarding = checked;
    if (checked) {
      this.finishOnboarding();
    }
  }

  private finishOnboarding(): void {
    this.onboardingDone = true;
    this.onboardingStep = this.onboardingScreens.length - 1;
    this.persistOnboarding();
  }

  private persistOnboarding(): void {
    this.onboardingService.updateStatus({ step: this.onboardingStep, completed: this.onboardingDone }).subscribe({
      error: () => {
        /* ignore */
      }
    });
  }

  setPeriodo(periodo: 'month' | 'quarter' | 'year'): void {
    this.periodo = periodo;
    this.updatePeriodTotals();
    this.atualizarSaldo();
    this.refreshSummaries();
    this.updateCategoryCharts();
    this.updateRecentTransactions();
    this.updateMonthlyFlow();
    this.updateOverviewDerived();
    this.updateInsight();
  }

  private refreshSummaries(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) return;
    this.loadRealAvailableBalance();
    this.loadDebtSummary();
    this.loadSubscriptionsSummary();
    this.loadAiHealth();
    this.loadNetWorthSummary();
    this.loadNetWorthHistory();
    this.loadProjection();
    this.loadRiskAssessment();
    this.loadInsights();
    this.loadRecommendations();
    this.loadBudgetSummary();
    this.loadInvestmentPositions();
  }

  private loadRealAvailableBalance(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.realBalanceSummary = null;
      return;
    }

    this.subRealBalance?.unsubscribe();
    this.subRealBalance = this.accountsService
      .getRealAvailableBalance(this.periodo, this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.realBalanceSummary = summary;
          this.updateInsight();
        },
        error: () => {
          this.realBalanceSummary = null;
          this.registerLoadError('saldo disponível');
          this.updateInsight();
        }
      });
  }

  private loadDebtSummary(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.debtSummary = null;
      return;
    }

    this.subDebtSummary?.unsubscribe();
    this.subDebtSummary = this.accountsService
      .getDebtSummary(this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.debtSummary = summary;
          this.totalDividaCartoes = summary?.cardDebt ?? this.totalDividaCartoes;
        },
        error: () => {
          this.debtSummary = null;
          this.registerLoadError('dívidas');
        }
      });
  }

  private loadSubscriptionsSummary(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.subscriptionsSummary = null;
      return;
    }

    this.subSubscriptionsSummary?.unsubscribe();
    this.subSubscriptionsSummary = this.accountsService
      .getSubscriptionsSummary(this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.subscriptionsSummary = summary;
        },
        error: () => {
          this.subscriptionsSummary = null;
          this.registerLoadError('assinaturas');
        }
      });
  }

  private loadAiHealth(): void {
    if (!this.isLogged || !this.hasAccess('Advanced')) {
      this.aiHealth = null;
      return;
    }

    this.subAiHealth?.unsubscribe();
    this.subAiHealth = this.financialAssistantService
      .health(this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (health) => {
          this.aiHealth = this.isAiHealthResponse(health)
            ? { ...health, areas: Array.isArray(health.areas) ? health.areas : [] }
            : null;
        },
        error: () => {
          this.aiHealth = null;
          this.registerLoadError('saúde financeira');
        }
      });
  }

  aiHealthAreaLabel(area: string): string {
    switch (area) {
      case 'cashflow': return 'Caixa';
      case 'divida': return 'Dívida';
      case 'patrimonio': return 'Patrimônio';
      default: return area;
    }
  }

  aiHealthTone(status: AiHealthStatus): 'success' | 'warning' | 'danger' {
    return status === 'critical' ? 'danger' : status === 'warning' ? 'warning' : 'success';
  }

  private isAiHealthResponse(value: unknown): value is AiFinancialHealthResponse {
    if (!value || Array.isArray(value) || typeof value !== 'object') return false;
    return typeof (value as Partial<AiFinancialHealthResponse>).overallStatus === 'string';
  }

  metaStatusTone(status: GoalStatus): 'success' | 'warning' | 'danger' | 'muted' {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'InProgress':
        return 'warning';
      case 'Canceled':
        return 'danger';
      default:
        return 'muted';
    }
  }

  private loadNetWorthSummary(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.netWorthSummary = null;
      return;
    }

    this.subNetWorth?.unsubscribe();
    this.subNetWorth = this.accountsService
      .getNetWorthSummary(this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.netWorthSummary = summary;
        },
        error: () => {
          this.netWorthSummary = null;
          this.registerLoadError('patrimônio');
        }
      });
  }

  private loadNetWorthHistory(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.netWorthHistory = null;
      return;
    }

    this.subNetWorthHistory?.unsubscribe();
    /*
     * A evolução patrimonial é um gráfico de HISTÓRICO — precisa de série, não de ponto.
     * O seletor de período governa os indicadores; a profundidade do histórico tem piso
     * próprio. Com "Mês" o cálculo devolvia 1, o backend recusa com 400 ("use um valor
     * entre 3 e 24") e o dashboard abria com o aviso vermelho de falha logo após o login.
     */
    const MESES_MINIMOS_DE_HISTORICO = 3;
    const months = Math.max(this.periodMonthsCount(), MESES_MINIMOS_DE_HISTORICO);
    const referenceDate = this.periodo === 'year'
      ? this.toIsoDate(new Date(this.dataAtual.getFullYear(), 11, 31))
      : this.toIsoDate(rangeEndDate(this.getPeriodRange().endKey));
    this.subNetWorthHistory = this.accountsService
      .getNetWorthHistory(months, referenceDate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.netWorthHistory = history;
        },
        error: () => {
          this.netWorthHistory = null;
          this.registerLoadError('evolução patrimonial');
        }
      });
  }

  private loadProjection(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.cashflowProjection = null;
      return;
    }

    this.subProjection?.unsubscribe();
    this.subProjection = this.accountsService
      .getProjection(this.periodo, this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projection) => {
          this.cashflowProjection = projection;
          this.updateInsight();
        },
        error: () => {
          this.cashflowProjection = null;
          this.registerLoadError('projeção de caixa');
          this.updateInsight();
        }
      });
  }

  private loadRiskAssessment(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.riskAssessment = null;
      return;
    }

    this.subRiskAssessment?.unsubscribe();
    this.subRiskAssessment = this.accountsService
      .getRiskAssessment(this.periodo, this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (assessment) => {
          this.riskAssessment = assessment;
          this.updateInsight();
        },
        error: () => {
          this.riskAssessment = null;
          this.registerLoadError('análise de risco');
          this.updateInsight();
        }
      });
  }

  private loadInsights(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.insightEngine = null;
      this.engineInsightTips = [];
      return;
    }

    this.subInsights?.unsubscribe();
    this.subInsights = this.accountsService
      .getInsights(this.periodo, this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (insights) => {
          this.insightEngine = insights;
          this.engineInsightTips = insights.primaryInsight?.tips || [];
          this.updateInsight();
        },
        error: () => {
          this.insightEngine = null;
          this.engineInsightTips = [];
          this.registerLoadError('insights');
          this.updateInsight();
        }
      });
  }

  private loadRecommendations(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.recommendationEngine = null;
      return;
    }

    this.subRecommendations?.unsubscribe();
    this.subRecommendations = this.accountsService
      .getRecommendations(this.periodo, this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (recommendations) => {
          this.recommendationEngine = recommendations;
          this.updateInsight();
        },
        error: () => {
          this.recommendationEngine = null;
          this.registerLoadError('recomendações');
          this.updateInsight();
        }
      });
  }

  private loadBudgetSummary(): void {
    if (!this.isLogged || !this.hasAccess('Intermediate')) {
      this.budgetSummary = null;
      return;
    }

    this.subBudgetSummary?.unsubscribe();
    this.subBudgetSummary = this.budgetService
      .get(this.dataAtual.getFullYear(), this.dataAtual.getMonth() + 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (budget) => {
          this.budgetSummary = budget;
        },
        error: () => {
          this.budgetSummary = null;
        }
      });
  }

  private loadInvestmentPositions(): void {
    if (!this.isLogged || !this.hasAccess('Advanced')) {
      this.investmentPositions = [];
      return;
    }

    this.subInvestmentPositions?.unsubscribe();
    this.subInvestmentPositions = this.investmentsService
      .listPositions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (positions) => {
          this.investmentPositions = positions || [];
        },
        error: () => {
          this.investmentPositions = [];
          this.registerLoadError('investimentos');
        }
      });
  }

  private sumByMonthKey(
    lista: Array<{ valor: number; vencimento?: string; recebimento?: string }>,
    key: string
  ): number {
    return lista.reduce((sum, item) => {
      const dateKey = item.vencimento
        ? monthKeyFromLocaleDate(item.vencimento)
        : item.recebimento
          ? monthKeyFromLocaleDate(item.recebimento)
          : null;
      if (dateKey !== key) return sum;
      return sum + (item.valor || 0);
    }, 0);
  }

  private getPeriodRange(): { startKey: string; endKey: string } {
    const ano = this.dataAtual.getFullYear();
    if (this.periodo === 'year') {
      return { startKey: `${ano}-01`, endKey: `${ano}-12` };
    }
    if (this.periodo === 'quarter') {
      const quarter = Math.floor(this.dataAtual.getMonth() / 3);
      const startMonth = quarter * 3 + 1;
      const endMonth = startMonth + 2;
      return {
        startKey: `${ano}-${String(startMonth).padStart(2, '0')}`,
        endKey: `${ano}-${String(endMonth).padStart(2, '0')}`
      };
    }
    const mes = this.dataAtual.getMonth() + 1;
    return { startKey: `${ano}-${String(mes).padStart(2, '0')}`, endKey: `${ano}-${String(mes).padStart(2, '0')}` };
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isWithinRange(key: string, range: { startKey: string; endKey: string }): boolean {
    return key >= range.startKey && key <= range.endKey;
  }

  private atualizarMetas(goals: Goal[]): void {
    this.goalsRaw = goals;
    const planned = goals.filter((g) => g.status === 'Planned').length;
    const inProgress = goals.filter((g) => g.status === 'InProgress').length;
    const completed = goals.filter((g) => g.status === 'Completed').length;
    const canceled = goals.filter((g) => g.status === 'Canceled').length;

    const metasAtivas = goals.filter((g) => g.status !== 'Canceled' && g.targetAmount > 0);
    const targetTotal = metasAtivas.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const acumuladoTotal = metasAtivas.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const faltanteTotal = metasAtivas.reduce(
      (sum, g) => sum + Math.max((g.targetAmount || 0) - (g.currentAmount || 0), 0),
      0
    );
    const progressoMedio =
      metasAtivas.length > 0
        ? metasAtivas.reduce((sum, g) => {
            const ratio = g.targetAmount ? Math.min(g.currentAmount / g.targetAmount, 1) : 0;
            return sum + ratio * 100;
          }, 0) / metasAtivas.length
        : 0;

    this.metasResumo = {
      total: goals.length,
      planned,
      inProgress,
      completed,
      canceled,
      targetTotal,
      acumuladoTotal,
      faltanteTotal,
      progressoMedio
    };
    const statusLabel = (status: GoalStatus): string => {
      switch (status) {
        case 'Planned':
          return 'Planejada';
        case 'InProgress':
          return 'Em andamento';
        case 'Completed':
          return 'Concluída';
        case 'Canceled':
          return 'Cancelada';
        default:
          return 'Meta';
      }
    };
    const formatTargetDate = (value?: string | null): string | null => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    };

    this.metasDetalhe = metasAtivas
      .map((g) => {
      const target = g.targetAmount || 0;
      const current = g.currentAmount || 0;
      const remaining = Math.max(target - current, 0);
      const progress = target ? Math.min((current / target) * 100, 100) : 0;
        return {
          id: g.id,
          title: g.title,
          target,
          current,
          remaining,
          progress,
          status: g.status,
          statusLabel: statusLabel(g.status),
          targetDateLabel: formatTargetDate(g.targetDate),
          expectedMonthly: g.expectedMonthly || 0
        };
      })
      .sort((a, b) => a.progress - b.progress);
  }

  private updateInsight(): void {
    if (!this.expensesLoaded && !this.incomesLoaded) return;
    this.updateInsightDiagnostics();
    this.applyRiskAssessment();
    if (this.isRobotInsightFresh(this.latestRobotInsight)) {
      this.applyRobotInsight(this.latestRobotInsight!);
      return;
    }
    if (this.applyStructuredInsight()) {
      return;
    }

    if (this.insightDiagnostics.overdueExpensesCount > 0) {
      const overdueCritical = hasCriticalOverdueExpenseContext(
        this.insightDiagnostics.overdueExpensesCount,
        this.insightDiagnostics.overdueExpensesAmount,
        this.saldoBaseDisponivel,
        this.saldoPrincipal
      );
      this.setInsight(
        'Despesas vencidas em aberto',
        overdueCritical
          ? `Você tem ${this.insightDiagnostics.overdueExpensesCount} despesa(s) vencida(s) e o caixa não cobre o atraso atual. Priorize o pagamento agora.`
          : `Você tem ${this.insightDiagnostics.overdueExpensesCount} despesa(s) vencida(s), mas há saldo para quitar. Pague e dê baixa no sistema.`,
        overdueCritical ? 'danger' : 'warn',
        [
          `Recebidas: ${formatCurrency(this.totalRendas)}`,
          `Despesas: ${formatCurrency(this.totalDespesas)}`,
          `Saldo principal: ${formatCurrency(this.saldoPrincipal)}`,
          `Atrasado: ${formatCurrency(this.insightDiagnostics.overdueExpensesAmount)}`
        ],
        { label: 'Quitar despesas vencidas', route: '/despesas' }
      );
      return;
    }

    if (!this.totalRendas && !this.totalRendasPendentes && !this.totalDespesas) {
      this.setInsight(
        'Comece com o básico',
        'Cadastre uma receita e uma despesa para liberar análises automáticas.',
        'info',
        ['Sem lançamentos no período'],
        { label: 'Cadastrar receita', route: '/receitas' }
      );
      return;
    }

    if (!this.totalRendas && this.totalRendasPendentes > 0 && this.totalDespesas > 0) {
      this.setInsight(
        'Receitas ainda pendentes',
        'Você já tem despesas no mês, mas a receita ainda não foi recebida. O saldo considera apenas o que já entrou.',
        'warn',
        [
          `Cobertura atual: ${this.coberturaDespesasPercentual.toFixed(0)}%`,
          `Pendente: ${formatCurrency(this.totalRendasPendentes)}`,
          `Saldo projetado: ${formatCurrency(this.saldoProjetadoComPendencias)}`
        ],
        { label: 'Confirmar recebimentos', route: '/receitas' }
      );
      return;
    }

    if (!this.totalRendas && this.totalRendasPendentes > 0) {
      this.setInsight(
        'Receita pendente de confirmação',
        'Marque o recebimento para o valor entrar no saldo principal e refletir no resultado do mês.',
        'info',
        [
          `Pendente: ${formatCurrency(this.totalRendasPendentes)}`,
          `Saldo atual: ${formatCurrency(this.saldoPrincipal)}`,
          `Saldo projetado: ${formatCurrency(this.saldoProjetadoComPendencias)}`
        ],
        { label: 'Marcar como recebido', route: '/receitas' }
      );
      return;
    }

    if (!this.totalRendas && this.totalDespesas > 0) {
      this.setInsight(
        'Sem receita recebida no período',
        'Cadastre ou confirme uma receita recebida para atualizar o saldo principal.',
        'danger',
        [
          `Despesas: ${formatCurrency(this.totalDespesas)}`,
          `Saldo principal: ${formatCurrency(this.saldoPrincipal)}`
        ],
        { label: 'Cadastrar receita', route: '/receitas' }
      );
      return;
    }

    if (this.saldo < 0) {
      this.setInsight(
        'Saldo negativo neste mês',
        'Priorize cortar despesas variáveis ou antecipar receitas.',
        'danger',
        [
          `Saldo atual: ${formatCurrency(this.saldoPrincipal)}`,
          `Cobertura: ${this.coberturaDespesasPercentual.toFixed(0)}%`,
          `Pendente: ${formatCurrency(this.totalRendasPendentes)}`
        ],
        { label: 'Revisar despesas', route: '/despesas' }
      );
      return;
    }

    const taxaGasto = this.totalRendas ? this.totalDespesas / this.totalRendas : 0;
    if (taxaGasto > 0.85) {
      this.setInsight(
        'Despesas consumindo sua renda',
        'Mais de 85% da sua renda recebida já está comprometida neste mês.',
        'danger',
        [
          `Recebidas: ${formatCurrency(this.totalRendas)}`,
          `Despesas: ${formatCurrency(this.totalDespesas)}`,
          `Comprometido: ${(taxaGasto * 100).toFixed(0)}%`
        ],
        { label: 'Ajustar gastos do mês', route: '/despesas' }
      );
      return;
    }

    if (taxaGasto > 0.7) {
      this.setInsight(
        'Despesas altas neste mês',
        'Mais de 70% da sua renda recebida já foi usada.',
        'warn',
        [
          `Recebidas: ${formatCurrency(this.totalRendas)}`,
          `Despesas: ${formatCurrency(this.totalDespesas)}`,
          `Comprometido: ${(taxaGasto * 100).toFixed(0)}%`
        ],
        { label: 'Rever categorias de despesa', route: '/despesas' }
      );
      return;
    }

    if (this.totalDividaCartoes > 0 && this.totalDividaCartoes > this.totalRendas * 0.3) {
      this.setInsight(
        'Cartões com saldo elevado',
        'O total em cartões passou de 30% da sua renda recebida no mês.',
        'warn',
        [
          `Dívida cartões: ${formatCurrency(this.totalDividaCartoes)}`,
          `Recebidas: ${formatCurrency(this.totalRendas)}`
        ],
        { label: 'Analisar cartões', route: '/cartoes' }
      );
      return;
    }

    const mesIndex = this.dataAtual.getMonth();
    const atual = this.sumByMonthKey(this.expensesRaw, `${this.dataAtual.getFullYear()}-${String(mesIndex + 1).padStart(2, '0')}`);
    const anterior = this.sumByMonthKey(this.expensesRaw, `${this.dataAtual.getFullYear()}-${String(mesIndex).padStart(2, '0')}`);
    if (anterior > 0 && atual > anterior * 1.2) {
      this.setInsight(
        'Despesas subiram',
        'Seus gastos aumentaram mais de 20% em relação ao mês anterior.',
        'warn',
        [
          `Mês atual: ${formatCurrency(atual)}`,
          `Mês anterior: ${formatCurrency(anterior)}`
        ],
        { label: 'Comparar despesas', route: '/despesas' }
      );
      return;
    }

    if (this.metasResumo.total === 0 && this.saldo > 0) {
      this.setInsight(
        'Defina uma meta para o ano',
        'Com saldo positivo, você pode planejar um objetivo maior.',
        'info',
        [
          `Saldo principal: ${formatCurrency(this.saldoPrincipal)}`,
          `Pendente: ${formatCurrency(this.totalRendasPendentes)}`
        ],
        { label: 'Criar meta', route: '/metas' }
      );
      return;
    }

    this.setInsight(
      'Boa estabilidade no mês',
      'Você manteve o saldo positivo e as despesas sob controle.',
      'ok',
      [
        `Saldo principal: ${formatCurrency(this.saldoPrincipal)}`,
        `Cobertura: ${this.coberturaDespesasPercentual.toFixed(0)}%`,
        `Pendente: ${formatCurrency(this.totalRendasPendentes)}`
      ],
      { label: 'Acompanhar metas', route: '/metas' }
    );
  }

  private setInsight(
    title: string,
    message: string,
    tone: 'ok' | 'warn' | 'danger' | 'info',
    highlights: string[] = [],
    action: { label: string; route: string } | null = null
  ): void {
    const goalLabel = getFinancialGoalLabel(this.financialGoal);
    const enriched = goalLabel ? [...highlights, `Objetivo: ${goalLabel}`] : highlights;
    this.insight = { title, message, tone };
    this.insightHighlights = enriched;
    this.insightAction = action;
  }

  private updateInsightDiagnostics(): void {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueSoonLimit = new Date(startOfToday);
    dueSoonLimit.setDate(dueSoonLimit.getDate() + DASHBOARD_UPCOMING_DUE_DAYS);
    const range = this.getPeriodRange();

    const openExpenses = this.expensesRaw.filter((expense) => {
      if (!this.isDateInRange(expense.vencimento, range)) return false;
      return isExpenseOpen(expense.status);
    });
    const openIncomes = this.incomesRaw.filter((income) => {
      if (!this.isDateInRange(income.recebimento, range)) return false;
      return isIncomePending(income.status);
    });

    const overdueExpenses = openExpenses.filter((expense) => {
      const date = parseLocaleDate(expense.vencimento);
      return !!date && date < startOfToday;
    });
    const overdueIncomes = openIncomes.filter((income) => {
      const date = parseLocaleDate(income.recebimento);
      return !!date && date < startOfToday;
    });
    /* A janela de 7 dias sai de `expensesRaw`, e NÃO de `openExpenses`: este
       último já vem recortado pelo período exibido (o mês). Do dia 25 em diante
       parte da janela cai no mês seguinte, e o painel mostrava R$ 0,00 na
       semana em que o dado mais importa. O recorte por período vale para os
       totais do mês; para "próximos 7 dias", não. */
    const dueSoonExpenses = this.expensesRaw.filter((expense) => {
      if (!isExpenseOpen(expense.status)) return false;
      const date = parseLocaleDate(expense.vencimento);
      return !!date && date >= startOfToday && date <= dueSoonLimit;
    });

    const dueSoonExpensesAmount = dueSoonExpenses.reduce((sum, expense) => sum + (expense.valor || 0), 0);
    const overdueExpensesAmount = overdueExpenses.reduce((sum, expense) => sum + (expense.valor || 0), 0);
    const pendingExpensesAmount =
      this.realBalanceSummary?.pendingExpensesAmount ?? openExpenses.reduce((sum, expense) => sum + (expense.valor || 0), 0);
    const pendingIncomesAmount =
      this.realBalanceSummary?.pendingIncomesAmount ?? openIncomes.reduce((sum, income) => sum + (income.valor || 0), 0);
    const accountsBalance = this.realBalanceSummary?.activeAccountsBalance ?? this.totalSaldoContas;
    const projectedBalance = this.realBalanceSummary?.projectedAvailableBalance ?? this.saldoProjetadoComPendencias;
    const currentCoverage = pendingExpensesAmount > 0 ? (accountsBalance / pendingExpensesAmount) * 100 : 100;
    const projectedCoverage = pendingExpensesAmount > 0 ? ((accountsBalance + pendingIncomesAmount) / pendingExpensesAmount) * 100 : 100;
    const riskDay = this.cashflowProjection?.riskDate
      ? new Date(`${this.cashflowProjection.riskDate}T00:00:00`)
      : estimateRiskDayFromCurrentData(startOfToday, range, accountsBalance, openIncomes, openExpenses);
    const healthScore = calculateInsightHealthScore(
      this.totalRendas,
      this.totalRendasPendentes,
      this.totalDespesas,
      overdueExpenses.length,
      overdueIncomes.length,
      dueSoonExpensesAmount,
      projectedBalance
    );
    this.updateInsightPriority(overdueExpenses.length, overdueExpensesAmount, projectedBalance, this.totalRendasPendentes, dueSoonExpensesAmount);
    this.updateInsightActionSentence(overdueExpenses.length, overdueExpensesAmount, projectedBalance, overdueIncomes.length);
    this.updateInsightShortGoal(projectedBalance, dueSoonExpensesAmount, overdueExpenses.length);
    this.updateInsightDeadline(startOfToday, openExpenses);
    this.updateInsightComparison();
    this.updateInsightChangesToday(startOfToday);
    this.updateInsightTodoItems(startOfToday, openExpenses, openIncomes);

    this.insightDiagnostics = {
      healthScore,
      riskDayLabel: riskDay ? riskDay.toLocaleDateString('pt-BR') : null,
      overdueExpensesCount: this.realBalanceSummary?.overdueExpensesCount ?? overdueExpenses.length,
      overdueExpensesAmount: this.realBalanceSummary?.overdueExpensesAmount ?? overdueExpensesAmount,
      overdueIncomesCount: overdueIncomes.length,
      dueSoonExpensesAmount: this.realBalanceSummary?.dueSoonExpensesAmount ?? dueSoonExpensesAmount,
      projectedBalance,
      currentCoverage,
      projectedCoverage
    };
  }

  private updateInsightPriority(
    overdueExpensesCount: number,
    overdueExpensesAmount: number,
    projectedBalance: number,
    pendingIncomeAmount: number,
    dueSoonExpenseAmount: number
  ): void {
    if (
      projectedBalance < 0 ||
      hasCriticalOverdueExpenseContext(overdueExpensesCount, overdueExpensesAmount, this.saldoBaseDisponivel, this.saldoPrincipal)
    ) {
      this.insightPriority = 'Crítico';
      return;
    }
    if (pendingIncomeAmount > 0 || dueSoonExpenseAmount > 0) {
      this.insightPriority = 'Atenção';
      return;
    }
    this.insightPriority = 'Estável';
  }

  private updateInsightActionSentence(
    overdueExpensesCount: number,
    overdueExpensesAmount: number,
    projectedBalance: number,
    overdueIncomesCount: number
  ): void {
    if (overdueExpensesCount > 0) {
      const overdueCritical = hasCriticalOverdueExpenseContext(
        overdueExpensesCount,
        overdueExpensesAmount,
        this.saldoBaseDisponivel,
        this.saldoPrincipal
      );
      this.insightActionSentence = overdueCritical
        ? `Pague ${overdueExpensesCount} despesa(s) atrasada(s) hoje para evitar agravamento do caixa.`
        : `Você tem saldo para quitar ${overdueExpensesCount} despesa(s) atrasada(s). Pague e dê baixa no sistema.`;
      return;
    }
    if (projectedBalance < 0) {
      this.insightActionSentence = `Seu fechamento projetado está negativo. Ajuste gastos ainda hoje para evitar déficit.`;
      return;
    }
    if (overdueIncomesCount > 0) {
      this.insightActionSentence = `Confirme as receitas em atraso para corrigir o caixa real do mês.`;
      return;
    }
    this.insightActionSentence = `Mantenha o ritmo e acompanhe os próximos vencimentos para fechar o mês com folga.`;
  }

  private updateInsightShortGoal(
    projectedBalance: number,
    dueSoonExpenseAmount: number,
    overdueExpensesCount: number
  ): void {
    if (projectedBalance < 0) {
      this.insightShortGoal = `Meta de curto prazo: recuperar ${formatCurrency(Math.abs(projectedBalance))} para fechar o mês em zero.`;
      return;
    }
    if (overdueExpensesCount > 0) {
      this.insightShortGoal = `Meta de curto prazo: zerar despesas atrasadas até o próximo fechamento.`;
      return;
    }
    if (dueSoonExpenseAmount > 0) {
      this.insightShortGoal = `Meta de curto prazo: reservar ${formatCurrency(dueSoonExpenseAmount)} para os próximos ${DASHBOARD_UPCOMING_DUE_DAYS} dias.`;
      return;
    }
    this.insightShortGoal = `Meta de curto prazo: manter saúde financeira acima de 70/100 até o fim do mês.`;
  }

  private updateInsightDeadline(today: Date, openExpenses: StoredExpense[]): void {
    const nextDue = openExpenses
      .map((expense) => parseLocaleDate(expense.vencimento))
      .filter((date): date is Date => !!date && date >= today)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    if (!nextDue) {
      this.insightDeadlineLabel = 'Sem vencimentos em aberto no período.';
      return;
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.round((nextDue.getTime() - today.getTime()) / msPerDay);
    const labelDate = nextDue.toLocaleDateString('pt-BR');
    if (days <= 0) {
      this.insightDeadlineLabel = `Próximo vencimento: hoje (${labelDate}).`;
      return;
    }
    this.insightDeadlineLabel = `Próximo vencimento em ${days} dia(s) (${labelDate}).`;
  }

  private updateInsightComparison(): void {
    const year = this.dataAtual.getFullYear();
    const currentMonth = this.dataAtual.getMonth() + 1;
    const currentKey = `${year}-${String(currentMonth).padStart(2, '0')}`;
    const previousMonthDate = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
    const prevKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const currentExpenses = this.sumByMonthKey(this.expensesRaw, currentKey);
    const prevExpenses = this.sumByMonthKey(this.expensesRaw, prevKey);
    const currentReceived = this.somarRendasMes(this.incomesRaw, { startKey: currentKey, endKey: currentKey });
    const prevReceived = this.somarRendasMes(this.incomesRaw, { startKey: prevKey, endKey: prevKey });

    this.insightComparison = [
      `Despesas: ${formatDelta(currentExpenses, prevExpenses)}`,
      `Receitas recebidas: ${formatDelta(currentReceived, prevReceived)}`
    ];
  }

  private updateInsightChangesToday(today: Date): void {
    const dueTodayExpenses = this.expensesRaw.filter((expense) => {
      const date = parseLocaleDate(expense.vencimento);
      return !!date && date.toDateString() === today.toDateString();
    });
    const pendingDueTodayExpenses = dueTodayExpenses.filter((expense) => isExpenseOpen(expense.status));

    const dueTodayIncomes = this.incomesRaw.filter((income) => {
      const date = parseLocaleDate(income.recebimento);
      return !!date && date.toDateString() === today.toDateString();
    });
    const pendingDueTodayIncomes = dueTodayIncomes.filter((income) => isIncomePending(income.status));
    const receivedTodayIncomes = dueTodayIncomes.filter((income) => isIncomeReceived(income.status));

    const changes: string[] = [];
    if (pendingDueTodayExpenses.length > 0) {
      changes.push(`${pendingDueTodayExpenses.length} despesa(s) vence(m) hoje e segue(m) em aberto.`);
    }
    if (pendingDueTodayIncomes.length > 0) {
      changes.push(`${pendingDueTodayIncomes.length} receita(s) prevista(s) para hoje ainda pendente(s).`);
    }
    if (receivedTodayIncomes.length > 0) {
      const totalReceivedToday = receivedTodayIncomes.reduce((sum, income) => sum + (income.valor || 0), 0);
      changes.push(`Recebimentos de hoje: ${formatCurrency(totalReceivedToday)} confirmados.`);
    }
    if (changes.length === 0) {
      changes.push('Nenhuma mudança crítica registrada hoje.');
    }
    this.insightChangesToday = changes;
  }

  private updateInsightTodoItems(
    today: Date,
    openExpenses: StoredExpense[],
    openIncomes: StoredIncome[]
  ): void {
    const overdueExpenses = openExpenses
      .map((expense) => ({ item: expense, date: parseLocaleDate(expense.vencimento) }))
      .filter((entry): entry is { item: StoredExpense; date: Date } => !!entry.date && entry.date < today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const dueSoonExpenses = openExpenses
      .map((expense) => ({ item: expense, date: parseLocaleDate(expense.vencimento) }))
      .filter((entry): entry is { item: StoredExpense; date: Date } => {
        if (!entry.date) return false;
        const limit = new Date(today);
        limit.setDate(limit.getDate() + 5);
        return entry.date >= today && entry.date <= limit;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const pendingIncomes = openIncomes
      .map((income) => ({ item: income, date: parseLocaleDate(income.recebimento) }))
      .filter((entry): entry is { item: StoredIncome; date: Date } => !!entry.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const todos: InsightTodoItem[] = [];

    if (pendingIncomes.length > 0) {
      const first = pendingIncomes[0];
      const count = pendingIncomes.length;
      const baseText =
        count === 1
          ? `Você tem 1 receita pendente com vencimento em ${first.date.toLocaleDateString('pt-BR')}.`
          : `Você tem ${count} receitas pendentes (próxima em ${first.date.toLocaleDateString('pt-BR')}).`;
      todos.push({
        id: 'pending-income',
        severity: first.date < today ? 'danger' : 'warn',
        text: baseText,
        actionLabel: 'Ir para receitas',
        route: '/receitas',
        queryParams: { focus: 'pending' }
      });
    }

    if (overdueExpenses.length > 0) {
      const first = overdueExpenses[0].date.toLocaleDateString('pt-BR');
      const last = overdueExpenses[overdueExpenses.length - 1].date.toLocaleDateString('pt-BR');
      const count = overdueExpenses.length;
      const overdueAmount = overdueExpenses.reduce((sum, item) => sum + (item.item.valor || 0), 0);
      const overdueCritical = hasCriticalOverdueExpenseContext(count, overdueAmount, this.saldoBaseDisponivel, this.saldoPrincipal);
      const period = first === last ? first : `${first} a ${last}`;
      todos.push({
        id: 'overdue-expenses',
        severity: overdueCritical ? 'danger' : 'warn',
        text: overdueCritical
          ? `Você tem ${count} despesa(s) vencida(s) no período ${period} e o caixa não cobre o total atrasado.`
          : `Você tem ${count} despesa(s) vencida(s) no período ${period} e saldo para quitar.`,
        actionLabel: overdueCritical ? 'Quitar despesas' : 'Quitar e dar baixa',
        route: '/despesas',
        queryParams: { focus: 'overdue' }
      });
    }

    if (dueSoonExpenses.length > 0) {
      const first = dueSoonExpenses[0].date.toLocaleDateString('pt-BR');
      const count = dueSoonExpenses.length;
      todos.push({
        id: 'due-soon-expenses',
        severity: 'warn',
        text: `Você tem ${count} despesa(s) próxima(s) do vencimento (primeira em ${first}).`,
        actionLabel: 'Ver próximas despesas',
        route: '/despesas',
        queryParams: { focus: 'upcoming' }
      });
    }

    this.insightTodoItems = todos.slice(0, 4);
  }

  private resolveInsightAction(primary: InsightEngineItemResponse): { label: string; route: string } | null {
    const firstRecommendation = this.recommendationEngine?.items?.[0] ?? primary.recommendations?.[0];
    if (firstRecommendation?.actionLabel && firstRecommendation?.route) {
      return { label: firstRecommendation.actionLabel, route: firstRecommendation.route };
    }
    return null;
  }

  private resolveRecommendationTodoItems(
    fallbackRecommendations: Array<{
      id: string;
      severity: 'danger' | 'warn' | 'info';
      text: string;
      actionLabel: string;
      route: string;
      queryParams?: Record<string, string>;
    }>
  ): InsightTodoItem[] {
    const ranked = this.recommendationEngine?.items || [];
    if (ranked.length > 0) {
      return ranked.slice(0, 4).map((item) => ({
        id: item.id,
        severity: item.severity,
        text: `${item.text} (${item.score}/100)`,
        actionLabel: item.actionLabel,
        route: item.route,
        queryParams: item.queryParams || {}
      }));
    }

    return fallbackRecommendations.map((item) => ({
      id: item.id,
      severity: item.severity,
      text: item.text,
      actionLabel: item.actionLabel,
      route: item.route,
      queryParams: item.queryParams || {}
    }));
  }

  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

}
