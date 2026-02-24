import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredExpense, StoredIncome, StoredCard } from './data/api-data.service';
import { CardsService } from './cards.service';
import { GoalsService, Goal, GoalStatus } from './goals.service';
import { Router, RouterModule } from '@angular/router';
import { expenseStatusLabel, incomeStatusLabel } from './utils/status';
import { OnboardingService } from './onboarding.service';
import { formatMonthYearLabel, monthKeyFromLocaleDate, parseLocaleDate } from './utils/locale-utils';
import { AccountsService, AccountResponse } from './accounts.service';
import { AuthService } from './auth.service';
import { hasAtLeastRole, UserRole } from './roles';
import { ProfileService } from './profile.service';

type InsightDiagnostics = {
  healthScore: number;
  riskDayLabel: string | null;
  overdueExpensesCount: number;
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
  imports: [CommonModule, DecimalPipe, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private subExpenses?: Subscription;
  private subIncomes?: Subscription;
  private subCards?: Subscription;
  private subGoals?: Subscription;
  private subAccounts?: Subscription;
  private subProfile?: Subscription;
  private expensesLoaded = false;
  private incomesLoaded = false;

  dataAtual = new Date();
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
      bullets: ['Salario, freelas ou beneficios', 'Defina se e fixa ou avulsa'],
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
  private readonly expenseCategoryColors = ['#2563EB', '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];
  private readonly incomeSourceColors = ['#22C55E', '#0EA5E9', '#2563EB', '#8B5CF6', '#F59E0B', '#14B8A6'];

  constructor(
    private db: ApiDataService,
    private goalsService: GoalsService,
    private cardsService: CardsService,
    private onboardingService: OnboardingService,
    private accountsService: AccountsService,
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.isLogged) {
      this.subProfile = this.profileService.getProfile().subscribe({
        next: (profile) => {
          this.financialGoal = profile?.financialGoal || null;
          this.updateInsight();
        },
        error: () => {
          this.financialGoal = null;
        }
      });
      this.onboardingService.getStatus().subscribe({
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
    }
    this.subExpenses = this.db.expenses$.subscribe((lista) => {
      this.expensesLoaded = true;
      this.expensesRaw = lista;
      this.totalDespesas = this.somarDespesasMes(lista);
      this.atualizarSaldo();
      this.updateCategoryCharts();
      this.atualizarDividaCartoes();
      this.updateRecentTransactions();
      this.updateInsight();
    });
    this.subIncomes = this.db.incomes$.subscribe((lista) => {
      this.incomesLoaded = true;
      this.incomesRaw = lista;
      this.totalRendas = this.somarRendasMes(lista);
      this.totalRendasPendentes = this.somarRendasPendentesMes(lista);
      this.atualizarSaldo();
      this.updateCategoryCharts();
      this.updateRecentTransactions();
      this.updateInsight();
    });
    this.subCards = this.db.cards$.subscribe((lista) => {
      this.cards = lista;
    });
    if (this.isLogged) {
      this.subAccounts = this.accountsService.list().subscribe({
        next: (accounts) => {
          this.accountBalances = (accounts || []).filter((a) => a.isActive);
          this.accountsService.resolveDefaultAccountId(this.accountBalances);
        },
        error: () => {
          this.accountBalances = [];
        }
      });
    }
    if (this.isLogged) {
      this.subGoals = this.goalsService.list(this.dataAtual.getFullYear()).subscribe({
        next: (goals) => this.atualizarMetas(goals),
        error: (err) => console.error('Falha ao carregar metas', err)
      });
    }
  }

  ngOnDestroy(): void {
    this.subExpenses?.unsubscribe();
    this.subIncomes?.unsubscribe();
    this.subCards?.unsubscribe();
    this.subGoals?.unsubscribe();
    this.subAccounts?.unsubscribe();
    this.subProfile?.unsubscribe();
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
    switch (this.insight.tone) {
      case 'danger':
        return [
          'Revise despesas com vencimento proximo',
          'Priorize cortar gastos variaveis',
          'Antecipe receitas se possivel'
        ];
      case 'warn':
        return ['Acompanhe os gastos da semana', 'Evite novas compras parceladas', 'Defina um limite diario'];
      case 'info':
        return ['Cadastre receitas e despesas principais', 'Crie sua primeira meta anual'];
      default:
        return ['Mantenha o ritmo atual', 'Reavalie suas metas no fim do mes'];
    }
  }

  get insightHealthToneClass(): string {
    const score = this.insightDiagnostics.healthScore;
    if (score < 45) return 'text-rose-700 bg-rose-500/10 border-rose-300/60';
    if (score < 70) return 'text-amber-700 bg-amber-500/10 border-amber-300/60';
    return 'text-emerald-700 bg-emerald-500/10 border-emerald-300/60';
  }

  get insightRiskToneClass(): string {
    if (this.insightDiagnostics.riskDayLabel) {
      return 'border-rose-300/60 bg-rose-500/10 text-rose-700';
    }
    return 'border-emerald-300/60 bg-emerald-500/10 text-emerald-700';
  }

  get insightOverdueToneClass(): string {
    const totalOverdue = this.insightDiagnostics.overdueExpensesCount + this.insightDiagnostics.overdueIncomesCount;
    if (totalOverdue > 0) {
      return 'border-rose-300/60 bg-rose-500/10 text-rose-700';
    }
    return 'border-slate-300/60 bg-slate-500/10 text-slate-700';
  }

  get insightProjectedToneClass(): string {
    if (this.insightDiagnostics.projectedBalance < 0) {
      return 'border-rose-300/60 bg-rose-500/10 text-rose-700';
    }
    return 'border-sky-300/60 bg-sky-500/10 text-sky-700';
  }

  get insightPriorityClass(): string {
    if (this.insightPriority === 'Crítico') return 'border-rose-300/60 bg-rose-500/10 text-rose-700';
    if (this.insightPriority === 'Atenção') return 'border-amber-300/60 bg-amber-500/10 text-amber-700';
    return 'border-emerald-300/60 bg-emerald-500/10 text-emerald-700';
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

  hasAccess(minRole: UserRole): boolean {
    return hasAtLeastRole(this.currentRole, minRole);
  }

  private atualizarDividaCartoes(): void {
    this.cardsService.debtTotal().subscribe({
      next: ({ total }) => {
        this.totalDividaCartoes = total ?? 0;
        this.updateInsight();
      },
      error: (err) => console.error('Falha ao carregar dívida dos cartões', err)
    });
  }

  get isLogged(): boolean {
    return !!this.storage?.getItem('access_token');
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
      .filter((r) => this.isDateInRange(r.recebimento, range) && this.isIncomeReceived(r.status))
      .reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  private somarRendasPendentesMes(
    lista: StoredIncome[],
    range: { startKey: string; endKey: string } = this.getPeriodRange()
  ): number {
    return lista
      .filter((r) => this.isDateInRange(r.recebimento, range) && this.isIncomePending(r.status))
      .reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  private calcularSaldoAnterior(range: { startKey: string; endKey: string }): number {
    const receitasRecebidasAntes = this.incomesRaw
      .filter((r) => this.isBeforeRange(r.recebimento, range) && this.isIncomeReceived(r.status))
      .reduce((sum, r) => sum + (r.valor || 0), 0);
    const despesasAntes = this.expensesRaw
      .filter((d) => this.isBeforeRange(d.vencimento, range))
      .reduce((sum, d) => sum + (d.valor || 0), 0);
    return receitasRecebidasAntes - despesasAntes;
  }

  private isIncomeReceived(status?: string): boolean {
    return status === 'PAID' || status === 'PARTIALLY_PAID' || status === 'ANTICIPATED';
  }

  private isIncomePending(status?: string): boolean {
    return !status || status === 'OPEN';
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
    this.expenseCategoryChartBackground = this.buildCategoryChartBackground();
    this.incomeSourceTotal = incomeData.reduce((sum, item) => sum + item.total, 0);
    this.incomeSourceSlices = incomeData.map((item, index) => ({
      ...item,
      percent: this.incomeSourceTotal > 0 ? (item.total / this.incomeSourceTotal) * 100 : 0,
      color: this.incomeSourceColors[index % this.incomeSourceColors.length]
    }));
    this.incomeSourceChartBackground = this.buildIncomeChartBackground();
  }

  private buildCategoryChartBackground(): string {
    if (!this.expenseCategorySlices.length || this.expenseCategoryTotal <= 0) {
      return 'conic-gradient(var(--surface-3) 0deg 360deg)';
    }

    let start = 0;
    const parts = this.expenseCategorySlices.map((item) => {
      const end = start + (item.percent / 100) * 360;
      const segment = `${item.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
      start = end;
      return segment;
    });

    return `conic-gradient(${parts.join(', ')})`;
  }

  private buildIncomeChartBackground(): string {
    if (!this.incomeSourceSlices.length || this.incomeSourceTotal <= 0) {
      return 'conic-gradient(var(--surface-3) 0deg 360deg)';
    }

    let start = 0;
    const parts = this.incomeSourceSlices.map((item) => {
      const end = start + (item.percent / 100) * 360;
      const segment = `${item.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
      start = end;
      return segment;
    });

    return `conic-gradient(${parts.join(', ')})`;
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
    this.updateCategoryCharts();
    this.updateRecentTransactions();
    this.updateInsight();
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

  private isWithinRange(key: string, range: { startKey: string; endKey: string }): boolean {
    return key >= range.startKey && key <= range.endKey;
  }

  private get storage(): Storage | null {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
      ? window.localStorage
      : null;
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

    if (this.insightDiagnostics.overdueExpensesCount > 0) {
      this.setInsight(
        'Despesas vencidas em aberto',
        `Você tem ${this.insightDiagnostics.overdueExpensesCount} despesa(s) vencida(s). Priorize o pagamento.`,
        'danger',
        [
          `Recebidas: ${this.formatCurrency(this.totalRendas)}`,
          `Despesas: ${this.formatCurrency(this.totalDespesas)}`,
          `Saldo principal: ${this.formatCurrency(this.saldoPrincipal)}`
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
          `Pendente: ${this.formatCurrency(this.totalRendasPendentes)}`,
          `Saldo projetado: ${this.formatCurrency(this.saldoProjetadoComPendencias)}`
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
          `Pendente: ${this.formatCurrency(this.totalRendasPendentes)}`,
          `Saldo atual: ${this.formatCurrency(this.saldoPrincipal)}`,
          `Saldo projetado: ${this.formatCurrency(this.saldoProjetadoComPendencias)}`
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
          `Despesas: ${this.formatCurrency(this.totalDespesas)}`,
          `Saldo principal: ${this.formatCurrency(this.saldoPrincipal)}`
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
          `Saldo atual: ${this.formatCurrency(this.saldoPrincipal)}`,
          `Cobertura: ${this.coberturaDespesasPercentual.toFixed(0)}%`,
          `Pendente: ${this.formatCurrency(this.totalRendasPendentes)}`
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
          `Recebidas: ${this.formatCurrency(this.totalRendas)}`,
          `Despesas: ${this.formatCurrency(this.totalDespesas)}`,
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
          `Recebidas: ${this.formatCurrency(this.totalRendas)}`,
          `Despesas: ${this.formatCurrency(this.totalDespesas)}`,
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
          `Dívida cartões: ${this.formatCurrency(this.totalDividaCartoes)}`,
          `Recebidas: ${this.formatCurrency(this.totalRendas)}`
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
          `Mês atual: ${this.formatCurrency(atual)}`,
          `Mês anterior: ${this.formatCurrency(anterior)}`
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
          `Saldo principal: ${this.formatCurrency(this.saldoPrincipal)}`,
          `Pendente: ${this.formatCurrency(this.totalRendasPendentes)}`
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
        `Saldo principal: ${this.formatCurrency(this.saldoPrincipal)}`,
        `Cobertura: ${this.coberturaDespesasPercentual.toFixed(0)}%`,
        `Pendente: ${this.formatCurrency(this.totalRendasPendentes)}`
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
    const goalLabel = this.getFinancialGoalLabel();
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
      return this.isExpenseOpen(expense.status);
    });
    const openIncomes = this.incomesRaw.filter((income) => {
      if (!this.isDateInRange(income.recebimento, range)) return false;
      return this.isIncomePending(income.status);
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
    const projectedBalance = this.saldoProjetadoComPendencias;
    const currentCoverage = this.totalDespesas > 0 ? (this.saldoBaseDisponivel / this.totalDespesas) * 100 : 100;
    const projectedCoverage = this.totalDespesas > 0 ? ((this.saldoBaseDisponivel + this.totalRendasPendentes) / this.totalDespesas) * 100 : 100;
    const riskDay = this.estimateRiskDayFromCurrentData(startOfToday, range, this.saldoBaseDisponivel, openIncomes, openExpenses);
    const healthScore = this.calculateInsightHealthScore(
      this.totalRendas,
      this.totalRendasPendentes,
      this.totalDespesas,
      overdueExpenses.length,
      overdueIncomes.length,
      dueSoonExpensesAmount,
      projectedBalance
    );
    this.updateInsightPriority(overdueExpenses.length, projectedBalance, this.totalRendasPendentes, dueSoonExpensesAmount);
    this.updateInsightActionSentence(overdueExpenses.length, projectedBalance, overdueIncomes.length);
    this.updateInsightShortGoal(projectedBalance, dueSoonExpensesAmount, overdueExpenses.length);
    this.updateInsightDeadline(startOfToday, openExpenses);
    this.updateInsightComparison();
    this.updateInsightChangesToday(startOfToday);
    this.updateInsightTodoItems(startOfToday, openExpenses, openIncomes);

    this.insightDiagnostics = {
      healthScore,
      riskDayLabel: riskDay ? riskDay.toLocaleDateString('pt-BR') : null,
      overdueExpensesCount: overdueExpenses.length,
      overdueIncomesCount: overdueIncomes.length,
      dueSoonExpensesAmount,
      projectedBalance,
      currentCoverage,
      projectedCoverage
    };
  }

  private updateInsightPriority(
    overdueExpensesCount: number,
    projectedBalance: number,
    pendingIncomeAmount: number,
    dueSoonExpenseAmount: number
  ): void {
    if (overdueExpensesCount > 0 || projectedBalance < 0) {
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
    projectedBalance: number,
    overdueIncomesCount: number
  ): void {
    if (overdueExpensesCount > 0) {
      this.insightActionSentence = `Pague ${overdueExpensesCount} despesa(s) atrasada(s) hoje para reduzir risco.`;
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
      this.insightShortGoal = `Meta de curto prazo: recuperar ${this.formatCurrency(Math.abs(projectedBalance))} para fechar o mês em zero.`;
      return;
    }
    if (overdueExpensesCount > 0) {
      this.insightShortGoal = `Meta de curto prazo: zerar despesas atrasadas até o próximo fechamento.`;
      return;
    }
    if (dueSoonExpenseAmount > 0) {
      this.insightShortGoal = `Meta de curto prazo: reservar ${this.formatCurrency(dueSoonExpenseAmount)} para os próximos 5 dias.`;
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
      `Despesas: ${this.formatDelta(currentExpenses, prevExpenses)}`,
      `Receitas recebidas: ${this.formatDelta(currentReceived, prevReceived)}`
    ];
  }

  private formatDelta(current: number, previous: number): string {
    if (previous <= 0 && current > 0) return `novo no mês (${this.formatCurrency(current)})`;
    if (previous <= 0 && current <= 0) return 'sem variação';
    const deltaPercent = ((current - previous) / previous) * 100;
    const trend = deltaPercent > 0 ? '+' : '';
    return `${trend}${deltaPercent.toFixed(0)}% vs mês anterior`;
  }

  private updateInsightChangesToday(today: Date): void {
    const dueTodayExpenses = this.expensesRaw.filter((expense) => {
      const date = parseLocaleDate(expense.vencimento);
      return !!date && date.toDateString() === today.toDateString();
    });
    const pendingDueTodayExpenses = dueTodayExpenses.filter((expense) => this.isExpenseOpen(expense.status));

    const dueTodayIncomes = this.incomesRaw.filter((income) => {
      const date = parseLocaleDate(income.recebimento);
      return !!date && date.toDateString() === today.toDateString();
    });
    const pendingDueTodayIncomes = dueTodayIncomes.filter((income) => this.isIncomePending(income.status));
    const receivedTodayIncomes = dueTodayIncomes.filter((income) => this.isIncomeReceived(income.status));

    const changes: string[] = [];
    if (pendingDueTodayExpenses.length > 0) {
      changes.push(`${pendingDueTodayExpenses.length} despesa(s) vence(m) hoje e segue(m) em aberto.`);
    }
    if (pendingDueTodayIncomes.length > 0) {
      changes.push(`${pendingDueTodayIncomes.length} receita(s) prevista(s) para hoje ainda pendente(s).`);
    }
    if (receivedTodayIncomes.length > 0) {
      const totalReceivedToday = receivedTodayIncomes.reduce((sum, income) => sum + (income.valor || 0), 0);
      changes.push(`Recebimentos de hoje: ${this.formatCurrency(totalReceivedToday)} confirmados.`);
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
      const period = first === last ? first : `${first} a ${last}`;
      todos.push({
        id: 'overdue-expenses',
        severity: 'danger',
        text: `Você tem ${count} despesa(s) vencida(s) no período ${period}.`,
        actionLabel: 'Quitar despesas',
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

  private calculateInsightHealthScore(
    incomeReceived: number,
    incomePending: number,
    expenseTotal: number,
    overdueExpensesCount: number,
    overdueIncomesCount: number,
    dueSoonExpenseAmount: number,
    projectedBalance: number
  ): number {
    let score = 100;

    if (overdueExpensesCount > 0) score -= Math.min(35, overdueExpensesCount * 12);
    if (overdueIncomesCount > 0) score -= Math.min(20, overdueIncomesCount * 8);
    if (incomeReceived <= 0 && incomePending > 0) score -= 20;
    if (expenseTotal > 0 && incomeReceived > 0 && incomeReceived / expenseTotal < 0.6) score -= 15;
    if (dueSoonExpenseAmount > incomeReceived && dueSoonExpenseAmount > 0) score -= 10;
    if (projectedBalance < 0) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  private estimateRiskDayFromCurrentData(
    today: Date,
    range: { startKey: string; endKey: string },
    initialBalance: number,
    openIncomes: StoredIncome[],
    openExpenses: StoredExpense[]
  ): Date | null {
    let runningBalance = initialBalance;
    const entries = new Map<string, number>();
    const endDate = this.rangeEndDate(range.endKey);

    for (const income of openIncomes) {
      const date = parseLocaleDate(income.recebimento);
      if (!date) continue;
      const effectiveDate = date < today ? today : date;
      const key = this.dateKey(effectiveDate);
      entries.set(key, (entries.get(key) ?? 0) + (income.valor || 0));
    }

    for (const expense of openExpenses) {
      const date = parseLocaleDate(expense.vencimento);
      if (!date) continue;
      const effectiveDate = date < today ? today : date;
      const key = this.dateKey(effectiveDate);
      entries.set(key, (entries.get(key) ?? 0) - (expense.valor || 0));
    }

    for (let cursor = new Date(today); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
      const key = this.dateKey(cursor);
      const delta = entries.get(key) ?? 0;
      runningBalance += delta;
      if (runningBalance < 0) {
        return new Date(cursor);
      }
    }

    return null;
  }

  private rangeEndDate(endKey: string): Date {
    const [yearText, monthText] = endKey.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const lastDay = new Date(year, month, 0);
    return new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isExpenseOpen(status?: string): boolean {
    return !status || status === 'OPEN' || status === 'PARTIALLY_PAID';
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private getFinancialGoalLabel(): string | null {
    switch (this.financialGoal) {
      case 'vida-financeira':
        return 'Melhorar vida financeira';
      case 'sair-dividas':
        return 'Sair das dívidas';
      case 'comecar-investir':
        return 'Começar a investir';
      case 'reserva-emergencia':
        return 'Criar reserva de emergência';
      default:
        return null;
    }
  }
  trackByIndex(index: number): number {
    return index;
  }

}
