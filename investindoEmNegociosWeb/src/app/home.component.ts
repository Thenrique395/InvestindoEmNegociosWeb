import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredExpense, StoredIncome, StoredCard } from './data/api-data.service';
import { CardsService } from './cards.service';
import { GoalsService, Goal, GoalStatus } from './goals.service';
import { Router, RouterModule } from '@angular/router';
import { expenseStatusLabel, incomeStatusLabel } from './utils/status';
import { OnboardingService } from './onboarding.service';
import { formatMonthYearLabel, monthKeyFromLocaleDate, parseLocaleDate } from './utils/locale-utils';
import {
  buildConicGradient,
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
} from './utils/home-insight.utils';
import { AccountsService, AccountResponse, CashflowProjectionResponse, DebtSummaryResponse, InsightEngineItemResponse, InsightEngineResponse, NetWorthHistoryResponse, NetWorthSummaryResponse, RealAvailableBalanceResponse, RecommendationEngineResponse, RiskBotAssessmentResponse } from './accounts.service';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';
import { ProfileService } from './profile.service';
import { NotificationsService, NotificationItem } from './notifications.service';
import { AppCurrencyPipe } from './shared/app-currency.pipe';
import { StatCardComponent } from './shared/stat-card/stat-card.component';

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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule, AppCurrencyPipe, StatCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private subRealBalance?: Subscription;
  private subDebtSummary?: Subscription;
  private subNetWorth?: Subscription;
  private subNetWorthHistory?: Subscription;
  private subProjection?: Subscription;
  private subRiskAssessment?: Subscription;
  private subInsights?: Subscription;
  private subRecommendations?: Subscription;
  private latestRobotInsight: NotificationItem | null = null;
  private expensesLoaded = false;
  private incomesLoaded = false;

  dataAtual = new Date();
  basicDashboardInsightIndex = 0;
  private expensesRaw: StoredExpense[] = [];
  private incomesRaw: StoredIncome[] = [];
  totalRendas = 0;
  totalRendasPendentes = 0;
  totalDespesas = 0;
  saldo = 0;
  saldoAnterior = 0;
  periodo: 'month' | 'quarter' | 'year' = 'month';
  cards: StoredCard[] = [];
  totalDividaCartoes = 0;
  accountBalances: AccountResponse[] = [];
  realBalanceSummary: RealAvailableBalanceResponse | null = null;
  debtSummary: DebtSummaryResponse | null = null;
  netWorthSummary: NetWorthSummaryResponse | null = null;
  netWorthHistory: NetWorthHistoryResponse | null = null;
  cashflowProjection: CashflowProjectionResponse | null = null;
  riskAssessment: RiskBotAssessmentResponse | null = null;
  insightEngine: InsightEngineResponse | null = null;
  recommendationEngine: RecommendationEngineResponse | null = null;
  expenseCategorySlices: { label: string; total: number; percent: number; color: string }[] = [];
  expenseCategoryTotal = 0;
  expenseCategoryChartBackground = 'conic-gradient(var(--surface-3) 0deg 360deg)';
  incomeSourceSlices: { label: string; total: number; percent: number; color: string }[] = [];
  incomeSourceTotal = 0;
  incomeSourceChartBackground = 'conic-gradient(var(--surface-3) 0deg 360deg)';
  recentTransactions: {
    id: string;
    title: string;
    date: string;
    amount: number;
    type: 'income' | 'expense';
    status?: string;
    recurring?: boolean;
  }[] = [];
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
  private readonly expenseCategoryColors = ['var(--color-chart-series-1)', 'var(--color-chart-series-5)', 'var(--color-chart-series-2)', 'var(--color-chart-series-3)', 'var(--color-chart-expense)', 'var(--color-chart-series-4)'];
  private readonly incomeSourceColors = ['var(--color-chart-income)', 'var(--color-chart-series-5)', 'var(--color-chart-series-1)', 'var(--color-chart-series-4)', 'var(--color-chart-series-3)', 'var(--color-chart-series-2)'];

  constructor(
    private db: ApiDataService,
    private goalsService: GoalsService,
    private cardsService: CardsService,
    private onboardingService: OnboardingService,
    private accountsService: AccountsService,
    private authService: AuthService,
    private profileService: ProfileService,
    private notificationsService: NotificationsService,
    private router: Router,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    if (this.isLogged) {
      this.profileService.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (profile) => {
          this.financialGoal = profile?.financialGoal || null;
          this.updateInsight();
        },
        error: () => {
          this.financialGoal = null;
        }
      });
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
      this.notificationsService.list(false, 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (items) => this.consumeRobotInsight(items || []),
        error: () => {
          this.robotInsightTips = [];
        }
      });
    }
    this.db.expenses$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.expensesLoaded = true;
      this.expensesRaw = lista;
      this.totalDespesas = this.somarDespesasMes(lista);
      this.atualizarSaldo();
      this.updateCategoryCharts();
      this.atualizarDividaCartoes();
      this.updateRecentTransactions();
      this.updateInsight();
    });
    this.db.incomes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.incomesLoaded = true;
      this.incomesRaw = lista;
      this.totalRendas = this.somarRendasMes(lista);
      this.totalRendasPendentes = this.somarRendasPendentesMes(lista);
      this.atualizarSaldo();
      this.updateCategoryCharts();
      this.updateRecentTransactions();
      this.updateInsight();
    });
    this.db.cards$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.cards = lista;
    });
    if (this.isLogged) {
      this.accountsService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (accounts) => {
          this.accountBalances = (accounts || []).filter((a) => a.isActive);
          this.accountsService.resolveDefaultAccountId(this.accountBalances);
          this.loadRealAvailableBalance();
          this.loadDebtSummary();
          this.loadNetWorthSummary();
          this.loadNetWorthHistory();
          this.loadProjection();
          this.loadRiskAssessment();
          this.loadInsights();
          this.loadRecommendations();
        },
        error: () => {
          this.accountBalances = [];
          this.realBalanceSummary = null;
          this.debtSummary = null;
          this.netWorthSummary = null;
          this.netWorthHistory = null;
          this.cashflowProjection = null;
          this.riskAssessment = null;
          this.insightEngine = null;
          this.recommendationEngine = null;
        }
      });
    }
    if (this.isLogged) {
      this.goalsService.list(this.dataAtual.getFullYear()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (goals) => this.atualizarMetas(goals),
        error: () => this.atualizarMetas([])
      });
    }
  }

  get mesAtualLabel(): string {
    if (this.periodo === 'quarter') {
      const quarter = Math.floor(this.dataAtual.getMonth() / 3) + 1;
      return `Trimestre ${quarter} de ${this.dataAtual.getFullYear()}`;
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
        return ['Mantenha o ritmo atual', 'Reavalie suas metas no fim do mes'];
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
    if (score < 45) return 'text-[var(--danger-text)] bg-rose-500/10 border-rose-300/60';
    if (score < 70) return 'text-[var(--warning-text)] bg-amber-500/10 border-amber-300/60';
    return 'text-[var(--success-text)] bg-emerald-500/10 border-emerald-300/60';
  }

  get insightRiskToneClass(): string {
    if (this.insightDiagnostics.riskDayLabel) {
      return 'border-rose-300/60 bg-rose-500/10 text-[var(--danger-text)]';
    }
    return 'border-emerald-300/60 bg-emerald-500/10 text-[var(--success-text)]';
  }

  get insightOverdueToneClass(): string {
    const totalOverdue = this.insightDiagnostics.overdueExpensesCount + this.insightDiagnostics.overdueIncomesCount;
    if (totalOverdue > 0) {
      return 'border-rose-300/60 bg-rose-500/10 text-[var(--danger-text)]';
    }
    return 'border-slate-300/60 bg-slate-500/10 text-slate-700';
  }

  get insightProjectedToneClass(): string {
    if (this.insightDiagnostics.projectedBalance < 0) {
      return 'border-rose-300/60 bg-rose-500/10 text-[var(--danger-text)]';
    }
    return 'border-sky-300/60 bg-sky-500/10 text-[var(--info-text)]';
  }

  get insightPriorityClass(): string {
    if (this.insightPriority === 'Crítico') return 'border-rose-300/60 bg-rose-500/10 text-[var(--danger-text)]';
    if (this.insightPriority === 'Atenção') return 'border-amber-300/60 bg-amber-500/10 text-[var(--warning-text)]';
    return 'border-emerald-300/60 bg-emerald-500/10 text-[var(--success-text)]';
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
    return this.realBalanceSummary?.realAvailableBalance ?? (this.totalSaldoContas - this.totalDespesas);
  }

  get saldoDisponivelProjetado(): number {
    return this.realBalanceSummary?.projectedAvailableBalance ?? (this.totalSaldoContas - this.totalDespesas + this.totalRendasPendentes);
  }

  get pendenciasCaixa(): number {
    return this.realBalanceSummary?.pendingExpensesAmount ?? this.totalDespesas;
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

  get debtBuckets() {
    return this.debtSummary?.buckets || [];
  }

  get debtNextItems() {
    return this.debtSummary?.nextItems || [];
  }

  get patrimonioHistoryPoints() {
    return this.netWorthHistory?.points || [];
  }

  get patrimonioHistoryMax(): number {
    return this.patrimonioHistoryPoints.reduce((max, item) => Math.max(max, item.netWorth), 0) || 1;
  }

  get patrimonioHistoryEstimated(): boolean {
    return !!this.netWorthHistory?.hasEstimatedPoints;
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

  get saldoComposicaoTotal(): number {
    return this.saldoBaseDisponivel + Math.max(this.totalDespesas, 0);
  }

  get saldoBasePercentual(): number {
    if (!this.saldoComposicaoTotal) return 0;
    return (this.saldoBaseDisponivel / this.saldoComposicaoTotal) * 100;
  }

  get saldoDespesasPercentual(): number {
    if (!this.saldoComposicaoTotal) return 0;
    return (Math.max(this.totalDespesas, 0) / this.saldoComposicaoTotal) * 100;
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

  get basicDashboardNextTitle(): string {
    if (!this.incomeEntriesCount && !this.expenseEntriesCount) {
      return 'Comece pelos primeiros lançamentos';
    }
    if (!this.incomeEntriesCount) {
      return 'Registre a primeira receita do período';
    }
    if (!this.expenseEntriesCount) {
      return 'Registre a primeira despesa do período';
    }
    if (!this.hasCardEntries) {
      return 'Opcional: revise seus cartões';
    }
    return 'Base do mês configurada';
  }

  get basicDashboardNextMessage(): string {
    if (!this.incomeEntriesCount && !this.expenseEntriesCount) {
      return 'Cadastre uma receita e uma despesa para começar com o dashboard refletindo sua rotina real.';
    }
    if (!this.incomeEntriesCount) {
      return 'Sem receitas registradas ainda. Adicione uma entrada para acompanhar o que realmente entrou no caixa.';
    }
    if (!this.expenseEntriesCount) {
      return 'Sem despesas registradas ainda. Lance a primeira saída para o saldo do mês ficar mais confiável.';
    }
    if (!this.hasCardEntries) {
      return 'Você já consegue operar normalmente. Se usar cartão, pode cadastrar depois para acompanhar compras no crédito.';
    }
    return 'Receitas, despesas e cartões já estão compondo a leitura principal do seu mês.';
  }

  get basicDashboardNextActionLabel(): string {
    if (!this.incomeEntriesCount) {
      return 'Cadastrar receita';
    }
    if (!this.expenseEntriesCount) {
      return 'Cadastrar despesa';
    }
    if (!this.hasCardEntries) {
      return 'Revisar cartões';
    }
    return 'Revisar despesas';
  }

  get basicDashboardNextActionLink(): string {
    if (!this.incomeEntriesCount) {
      return '/receitas';
    }
    if (!this.expenseEntriesCount) {
      return '/despesas';
    }
    if (!this.hasCardEntries) {
      return '/cartoes';
    }
    return '/despesas';
  }

  get basicDashboardInsightTitle(): string {
    if (this.basicDashboardActiveTodo) {
      return this.resolveBasicDashboardInsightTodoTitle(this.basicDashboardActiveTodo);
    }
    if (!this.incomeEntriesCount && !this.expenseEntriesCount) {
      return 'Faltam os primeiros lançamentos';
    }
    if (!this.incomeEntriesCount) {
      return 'Registre a primeira receita';
    }
    if (!this.expenseEntriesCount) {
      return 'Registre a primeira despesa';
    }
    if (this.saldoDisponivelReal < 0) {
      return 'Seu saldo está negativo';
    }
    if (this.totalRendasPendentes > 0) {
      return 'Existem receitas pendentes';
    }
    return 'Seu mês está no caminho certo';
  }

  get basicDashboardInsightMessage(): string {
    if (this.basicDashboardActiveTodo) {
      return this.basicDashboardActiveTodo.text;
    }
    if (!this.incomeEntriesCount && !this.expenseEntriesCount) {
      return 'Sem receita e despesa registradas, o dashboard ainda não reflete sua rotina real.';
    }
    if (!this.incomeEntriesCount) {
      return 'Sem entrada registrada, o valor que sobra no mês pode parecer menor do que realmente é.';
    }
    if (!this.expenseEntriesCount) {
      return 'Sem a primeira saída, o saldo ainda não mostra o custo real do seu mês.';
    }
    if (this.saldoDisponivelReal < 0) {
      return 'As saídas já superaram as entradas e o período pede ajuste imediato para evitar aperto no caixa.';
    }
    if (this.totalRendasPendentes > 0) {
      return 'Confirme o que já entrou para o saldo do período ficar mais fiel à sua realidade.';
    }
    return 'Receitas e despesas principais já estão registradas e o saldo do período está mais confiável.';
  }

  get basicDashboardInsightTone(): 'danger' | 'warn' | 'ok' {
    if (this.basicDashboardActiveTodo) {
      return this.basicDashboardActiveTodo.severity === 'danger'
        ? 'danger'
        : this.basicDashboardActiveTodo.severity === 'warn'
          ? 'warn'
          : 'ok';
    }
    if (!this.incomeEntriesCount || !this.expenseEntriesCount || this.saldoDisponivelReal < 0) {
      return 'danger';
    }
    if (this.totalRendasPendentes > 0 || !this.hasCardEntries) {
      return 'warn';
    }
    return 'ok';
  }

  get basicDashboardInsightBadge(): string {
    if (this.basicDashboardActiveTodo) {
      if (this.basicDashboardActiveTodo.severity === 'danger') {
        return 'Crítico';
      }
      if (this.basicDashboardActiveTodo.severity === 'warn') {
        return 'Atenção';
      }
      return 'Revisar';
    }
    if (this.basicDashboardInsightTone === 'danger') {
      return 'Ação necessária';
    }
    if (this.basicDashboardInsightTone === 'warn') {
      return 'Atenção';
    }
    return 'Tudo certo';
  }

  get basicDashboardSummaryTone(): 'danger' | 'warn' | 'ok' {
    if (this.saldoDisponivelReal < 0) {
      return 'danger';
    }
    if (this.totalRendasPendentes > 0) {
      return 'warn';
    }
    return 'ok';
  }

  get basicDashboardSummaryStatus(): string {
    if (this.basicDashboardSummaryTone === 'danger') {
      return 'Mês apertado';
    }
    if (this.basicDashboardSummaryTone === 'warn') {
      return 'Atenção ao saldo';
    }
    return 'Mês confortável';
  }

  get basicDashboardPendingReceivablesLabel(): string {
    if (this.totalRendasPendentes <= 0) {
      return 'Sem pendências';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.totalRendasPendentes);
  }

  get basicDashboardRecentTransactions(): typeof this.recentTransactions {
    return this.recentTransactions.slice(0, 4);
  }

  get basicDashboardActiveTodo(): InsightTodoItem | null {
    if (!this.insightTodoItems.length) return null;
    return this.insightTodoItems[this.currentBasicDashboardInsightIndex] ?? this.insightTodoItems[0];
  }

  get basicDashboardInsightCount(): number {
    return this.insightTodoItems.length || 1;
  }

  get basicDashboardInsightPosition(): number {
    return this.insightTodoItems.length ? this.currentBasicDashboardInsightIndex + 1 : 1;
  }

  get basicDashboardHasInsightPagination(): boolean {
    return this.insightTodoItems.length > 1;
  }

  get basicDashboardInsightExtraLabel(): string | null {
    return null;
  }

  get basicDashboardCurrentActionLink(): string {
    return this.basicDashboardActiveTodo?.route ?? this.basicDashboardNextActionLink;
  }

  get basicDashboardCurrentActionQueryParams(): Record<string, string> | null {
    return this.basicDashboardActiveTodo?.queryParams ?? null;
  }

  get basicDashboardCurrentActionLabel(): string {
    return this.basicDashboardActiveTodo?.actionLabel ?? this.basicDashboardNextActionLabel;
  }

  previousBasicDashboardInsight(): void {
    if (!this.insightTodoItems.length) return;
    this.basicDashboardInsightIndex =
      (this.currentBasicDashboardInsightIndex - 1 + this.insightTodoItems.length) % this.insightTodoItems.length;
  }

  nextBasicDashboardInsight(): void {
    if (!this.insightTodoItems.length) return;
    this.basicDashboardInsightIndex =
      (this.currentBasicDashboardInsightIndex + 1) % this.insightTodoItems.length;
  }

  private get currentBasicDashboardInsightIndex(): number {
    if (!this.insightTodoItems.length) return 0;
    return Math.max(0, Math.min(this.basicDashboardInsightIndex, this.insightTodoItems.length - 1));
  }

  private resolveBasicDashboardInsightTodoTitle(todo: InsightTodoItem): string {
    const route = todo.route || '';
    const focus = todo.queryParams?.['focus'] || '';
    const text = todo.text.toLowerCase();

    if (todo.id === 'pending-income' || route === '/receitas' || focus === 'pending' || text.includes('receita')) {
      return 'Receitas pendentes';
    }

    if (todo.id === 'overdue-expenses' || focus === 'overdue' || text.includes('vencida')) {
      return 'Despesas vencidas';
    }

    if (todo.id === 'due-soon-expenses' || focus === 'upcoming' || text.includes('próxima') || text.includes('proxima')) {
      return 'Despesas próximas do vencimento';
    }

    if (route === '/cartoes' || text.includes('cartão') || text.includes('cartao')) {
      return 'Cartões para revisar';
    }

    return 'Alerta do mês';
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

    const expenseData = cap(groupByLabel(expenses, (d) => d.categoria || 'Sem categoria'));
    const incomeData = cap(groupByLabel(incomes, (r) => r.categoria || 'Sem categoria'));

    this.expenseCategoryTotal = expenseData.reduce((sum, item) => sum + item.total, 0);
    this.expenseCategorySlices = expenseData.map((item, index) => ({
      ...item,
      percent: this.expenseCategoryTotal > 0 ? (item.total / this.expenseCategoryTotal) * 100 : 0,
      color: this.expenseCategoryColors[index % this.expenseCategoryColors.length]
    }));
    this.expenseCategoryChartBackground = buildConicGradient(this.expenseCategorySlices);
    this.incomeSourceTotal = incomeData.reduce((sum, item) => sum + item.total, 0);
    this.incomeSourceSlices = incomeData.map((item, index) => ({
      ...item,
      percent: this.incomeSourceTotal > 0 ? (item.total / this.incomeSourceTotal) * 100 : 0,
      color: this.incomeSourceColors[index % this.incomeSourceColors.length]
    }));
    this.incomeSourceChartBackground = buildConicGradient(this.incomeSourceSlices);
  }

  private updateRecentTransactions(): void {
    const expenseItems = this.expensesRaw.map((e) => ({
      id: e.id,
      title: e.nome || 'Despesa',
      date: e.vencimento || '—',
      amount: e.valor || 0,
      type: 'expense' as const,
      status: expenseStatusLabel(e.status),
      recurring: !!e.fixa,
      planId: e.planId
    }));
    const incomeItems = this.incomesRaw.map((i) => ({
      id: i.id,
      title: i.fonte || 'Receita',
      date: i.recebimento || '—',
      amount: i.valor || 0,
      type: 'income' as const,
      status: incomeStatusLabel(i.status),
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
    const slice = all.slice(0, 6);
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
    this.totalDespesas = this.somarDespesasMes(this.expensesRaw);
    this.totalRendas = this.somarRendasMes(this.incomesRaw);
    this.totalRendasPendentes = this.somarRendasPendentesMes(this.incomesRaw);
    this.atualizarSaldo();
    this.loadRealAvailableBalance();
    this.loadDebtSummary();
    this.loadNetWorthSummary();
    this.loadNetWorthHistory();
    this.loadProjection();
    this.loadRiskAssessment();
    this.loadInsights();
    this.loadRecommendations();
    this.updateCategoryCharts();
    this.updateRecentTransactions();
    this.updateInsight();
  }

  private loadRealAvailableBalance(): void {
    if (!this.isLogged) {
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
          this.updateInsight();
        }
      });
  }

  private loadDebtSummary(): void {
    if (!this.isLogged) {
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
        }
      });
  }

  private loadNetWorthSummary(): void {
    if (!this.isLogged) {
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
        }
      });
  }

  private loadNetWorthHistory(): void {
    if (!this.isLogged) {
      this.netWorthHistory = null;
      return;
    }

    this.subNetWorthHistory?.unsubscribe();
    this.subNetWorthHistory = this.accountsService
      .getNetWorthHistory(6, this.toIsoDate(this.dataAtual))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.netWorthHistory = history;
        },
        error: () => {
          this.netWorthHistory = null;
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
          this.updateInsight();
        }
      });
  }

  private loadRiskAssessment(): void {
    if (!this.isLogged) {
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
          this.updateInsight();
        }
      });
  }

  private loadInsights(): void {
    if (!this.isLogged) {
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
          this.updateInsight();
        }
      });
  }

  private loadRecommendations(): void {
    if (!this.isLogged) {
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
          this.updateInsight();
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
    dueSoonLimit.setDate(dueSoonLimit.getDate() + 5);
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
    const dueSoonExpenses = openExpenses.filter((expense) => {
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
      this.insightShortGoal = `Meta de curto prazo: reservar ${formatCurrency(dueSoonExpenseAmount)} para os próximos 5 dias.`;
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
