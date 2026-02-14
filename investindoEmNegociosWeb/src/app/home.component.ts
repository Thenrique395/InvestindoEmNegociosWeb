import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredExpense, StoredIncome, StoredCard } from './data/api-data.service';
import { CardsService } from './cards.service';
import { GoalsService, Goal, GoalStatus } from './goals.service';
import { RouterModule } from '@angular/router';
import { expenseStatusLabel, incomeStatusLabel } from './utils/status';
import { OnboardingService } from './onboarding.service';
import { formatMonthLabel, formatMonthYearLabel, monthKeyFromLocaleDate, parseLocaleDate } from './utils/locale-utils';

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
  private expensesLoaded = false;
  private incomesLoaded = false;

  dataAtual = new Date();
  chartType: 'bar' | 'line' = 'bar';
  lineTooltip:
    | {
        label: string;
        type: 'income' | 'expense';
        value: number;
        left: number;
        top: number;
      }
    | null = null;
  private expensesRaw: StoredExpense[] = [];
  private incomesRaw: StoredIncome[] = [];
  totalRendas = 0;
  totalDespesas = 0;
  saldo = 0;
  periodo: 'month' | 'quarter' | 'year' = 'month';
  cards: StoredCard[] = [];
  totalDividaCartoes = 0;
  monthlyData: { label: string; incomes: number; expenses: number }[] = [];
  maxMonthlyValue = 0;
  currentMonthDays = 0;
  expenseCategoryData: { label: string; total: number }[] = [];
  incomeSourceData: { label: string; total: number }[] = [];
  maxExpenseCategory = 0;
  maxIncomeSource = 0;
  incomesPolyline = '';
  expensesPolyline = '';
  incomesPoints: { x: number; y: number; label: string; value: number }[] = [];
  expensesPoints: { x: number; y: number; label: string; value: number }[] = [];
  recentTransactions: {
    id: string;
    title: string;
    date: string;
    amount: number;
    type: 'income' | 'expense';
    status?: string;
    recurring?: boolean;
  }[] = [];
  maxRecentAmount = 0;
  Math = Math;
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

  constructor(
    private db: ApiDataService,
    private goalsService: GoalsService,
    private cardsService: CardsService,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit(): void {
    if (this.isLogged) {
      this.onboardingService.getStatus().subscribe({
        next: (status) => {
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
      this.updateMonthlyData();
      this.updateCategoryCharts();
      this.atualizarDividaCartoes();
      this.updateRecentTransactions();
      this.updateInsight();
    });
    this.subIncomes = this.db.incomes$.subscribe((lista) => {
      this.incomesLoaded = true;
      this.incomesRaw = lista;
      this.totalRendas = this.somarRendasMes(lista);
      this.atualizarSaldo();
      this.updateMonthlyData();
      this.updateCategoryCharts();
      this.updateRecentTransactions();
      this.updateInsight();
    });
    this.subCards = this.db.cards$.subscribe((lista) => {
      this.cards = lista;
    });
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

  get chartTitle(): string {
    if (this.periodo === 'month') return 'Receitas x Despesas no mês';
    if (this.periodo === 'quarter') return 'Receitas x Despesas no trimestre';
    return 'Receitas x Despesas no ano';
  }

  get chartSubtitle(): string {
    if (this.periodo === 'month') return `Valores diários de ${this.mesAtualLabel}`;
    if (this.periodo === 'quarter') return `Valores mensais de ${this.mesAtualLabel}`;
    return `Valores mensais de ${this.dataAtual.getFullYear()}`;
  }

  get chartEmptyMessage(): string {
    if (this.periodo === 'month') return 'Cadastre sua primeira receita ou despesa para ver o gráfico diário.';
    if (this.periodo === 'quarter') return 'Cadastre sua primeira receita ou despesa para ver o gráfico do trimestre.';
    return 'Cadastre sua primeira receita ou despesa para ver o gráfico anual.';
  }

  get isLoadingDashboard(): boolean {
    return !(this.expensesLoaded && this.incomesLoaded);
  }

  get hasChartData(): boolean {
    return this.monthlyData.some((m) => (m.incomes || 0) > 0 || (m.expenses || 0) > 0);
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

  get cardsCount(): number {
    return this.cards.length;
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
    this.saldo = this.totalRendas - this.totalDespesas;
  }

  private somarDespesasMes(
    lista: StoredExpense[],
    range: { startKey: string; endKey: string } = this.getPeriodRange()
  ): number {
    return lista
      .filter((d) => {
        const key = this.mesKeyFromVencimento(d.vencimento);
        return key ? this.isWithinRange(key, range) : false;
      })
      .reduce((sum, d) => sum + (d.valor || 0), 0);
  }

  private somarRendasMes(
    lista: StoredIncome[],
    range: { startKey: string; endKey: string } = this.getPeriodRange()
  ): number {
    return lista
      .filter((r) => {
        const key = this.mesKeyFromRecebimento(r.recebimento);
        return key ? this.isWithinRange(key, range) : false;
      })
      .reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  private updateMonthlyData(): void {
    const ano = this.dataAtual.getFullYear();
    const mesIndex = this.dataAtual.getMonth();

    if (this.periodo === 'month') {
      const diasNoMes = new Date(ano, mesIndex + 1, 0).getDate();
      this.currentMonthDays = diasNoMes;
      const data = Array.from({ length: diasNoMes }).map((_, idx) => {
        const day = idx + 1;
        const start = new Date(ano, mesIndex, day);
        const end = new Date(ano, mesIndex, day, 23, 59, 59);
        const incomes = this.sumByDateRange(this.incomesRaw, 'recebimento', start, end);
        const expenses = this.sumByDateRange(this.expensesRaw, 'vencimento', start, end);
        return { label: String(day).padStart(2, '0'), incomes, expenses };
      });
      this.monthlyData = data;
      this.maxMonthlyValue = Math.max(...data.map((m) => Math.max(m.incomes, m.expenses, 0)), 0);
      this.updatePolylineData();
      return;
    }

    if (this.periodo === 'quarter') {
      this.currentMonthDays = 0;
        const quarterStart = Math.floor(mesIndex / 3) * 3;
        const data = Array.from({ length: 3 }).map((_, idx) => {
          const monthIndex = quarterStart + idx;
          const label = formatMonthLabel(ano, monthIndex, 'short');
          const key = `${ano}-${String(monthIndex + 1).padStart(2, '0')}`;
          const incomes = this.somarRendasMes(this.incomesRaw, { startKey: key, endKey: key });
          const expenses = this.somarDespesasMes(this.expensesRaw, { startKey: key, endKey: key });
        return { label, incomes, expenses };
      });
      this.monthlyData = data;
      this.maxMonthlyValue = Math.max(...data.map((m) => Math.max(m.incomes, m.expenses, 0)), 0);
      this.updatePolylineData();
      return;
    }

    this.currentMonthDays = 0;
    const data = Array.from({ length: 12 }).map((_, idx) => {
      const label = formatMonthLabel(ano, idx, 'short');
      const key = `${ano}-${String(idx + 1).padStart(2, '0')}`;
      const incomes = this.somarRendasMes(this.incomesRaw, { startKey: key, endKey: key });
      const expenses = this.somarDespesasMes(this.expensesRaw, { startKey: key, endKey: key });
      return { label, incomes, expenses };
    });
    this.monthlyData = data;
    this.maxMonthlyValue = Math.max(...data.map((m) => Math.max(m.incomes, m.expenses, 0)), 0);
    this.updatePolylineData();
  }

  private updateCategoryCharts(): void {
    const range = this.getPeriodRange();
    const expenses = this.expensesRaw.filter((d) => {
      const key = this.mesKeyFromVencimento(d.vencimento);
      return key ? this.isWithinRange(key, range) : false;
    });
    const incomes = this.incomesRaw.filter((r) => {
      const key = this.mesKeyFromRecebimento(r.recebimento);
      return key ? this.isWithinRange(key, range) : false;
    });

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

    this.expenseCategoryData = expenseData;
    this.incomeSourceData = incomeData;
    this.maxExpenseCategory = Math.max(...expenseData.map((item) => item.total), 0);
    this.maxIncomeSource = Math.max(...incomeData.map((item) => item.total), 0);
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
      const key = item.type === 'income' ? this.mesKeyFromRecebimento(item.date) : this.mesKeyFromVencimento(item.date);
      return key ? this.isWithinRange(key, range) : false;
    });
    all.sort((a, b) => {
      const da = parseLocaleDate(a.date)?.getTime() || 0;
      const db = parseLocaleDate(b.date)?.getTime() || 0;
      return db - da;
    });
    const slice = all.slice(0, 6);
    this.recentTransactions = slice;
    this.maxRecentAmount = Math.max(...slice.map((item) => Math.abs(item.amount)), 0);
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
    this.atualizarSaldo();
    this.updateMonthlyData();
    this.updateCategoryCharts();
    this.updateRecentTransactions();
    this.updateInsight();
  }

  trocarTipo(tipo: 'bar' | 'line'): void {
    this.chartType = tipo;
  }

  showLineTooltip(
    point: { x: number; y: number; label: string; value: number },
    type: 'income' | 'expense'
  ): void {
    const left = (point.x / 1100) * 100;
    const top = (point.y / 220) * 100;
    this.lineTooltip = { label: point.label, type, value: point.value, left, top };
  }

  hideLineTooltip(): void {
    this.lineTooltip = null;
  }

  private updatePolylineData(): void {
    if (!this.monthlyData.length) {
      this.incomesPolyline = '';
      this.expensesPolyline = '';
      this.incomesPoints = [];
      this.expensesPoints = [];
      return;
    }
    const lineData = this.buildLineData(this.monthlyData);
    this.incomesPolyline = lineData.incomesPolyline;
    this.expensesPolyline = lineData.expensesPolyline;
    this.incomesPoints = lineData.incomesPoints;
    this.expensesPoints = lineData.expensesPoints;
  }

  private buildLineData(
    data: { label: string; incomes: number; expenses: number }[]
  ): {
    incomesPolyline: string;
    expensesPolyline: string;
    incomesPoints: { x: number; y: number; label: string; value: number }[];
    expensesPoints: { x: number; y: number; label: string; value: number }[];
  } {
    const width = 1100;
    const height = 200;
    const padding = 14;
    const usableW = width - padding * 2;
    const usableH = height - padding * 2;
    const max = this.maxMonthlyValue || 1;
    const len = data.length || 1;
    const step = len > 1 ? usableW / (len - 1) : usableW;

    const build = (field: 'incomes' | 'expenses') => {
      const points = data.map((m, idx) => {
        const x = padding + idx * step;
        const v = m[field];
        const ratio = v / max;
        const y = height - padding - ratio * usableH;
        return { x, y, label: m.label, value: v };
      });
      const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
      return { polyline, points };
    };

    const incomesData = build('incomes');
    const expensesData = build('expenses');
    return {
      incomesPolyline: incomesData.polyline,
      expensesPolyline: expensesData.polyline,
      incomesPoints: incomesData.points,
      expensesPoints: expensesData.points
    };
  }

  private mesKey(): string {
    const y = this.dataAtual.getFullYear();
    const m = this.dataAtual.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  private mesKeyFromVencimento(vencimento: string): string | null {
    return monthKeyFromLocaleDate(vencimento);
  }

  private mesKeyFromRecebimento(recebimento: string): string | null {
    return monthKeyFromLocaleDate(recebimento);
  }

  private mesKeyFromMes(mesAno?: string): string | null {
    if (!mesAno) return null;
    const digits = mesAno.replace(/[^\d]/g, '');
    if (digits.length < 6) return null;
    const mes = digits.slice(0, 2);
    const ano = digits.slice(2, 6);
    return `${ano}-${mes}`;
  }

  private sumByMonthKey(
    lista: Array<{ valor: number; vencimento?: string; recebimento?: string }>,
    key: string
  ): number {
    return lista.reduce((sum, item) => {
      const dateKey = item.vencimento
        ? this.mesKeyFromVencimento(item.vencimento)
        : item.recebimento
          ? this.mesKeyFromRecebimento(item.recebimento)
          : null;
      if (dateKey !== key) return sum;
      return sum + (item.valor || 0);
    }, 0);
  }

  private sumByDateRange(
    lista: Array<{ valor: number; vencimento?: string; recebimento?: string }>,
    field: 'vencimento' | 'recebimento',
    start: Date,
    end: Date
  ): number {
    return lista.reduce((sum, item) => {
      const raw = field === 'vencimento' ? item.vencimento : item.recebimento;
      const date = raw ? parseLocaleDate(raw) : null;
      if (!date) return sum;
      if (date < start || date > end) return sum;
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

  private mesKeyBetween(target: string, inicio: string, fim: string | null): boolean {
    if (target < inicio) return false;
    if (fim && target > fim) return false;
    return true;
  }

  private get storage(): Storage | null {
    return typeof localStorage !== 'undefined' ? localStorage : null;
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

    if (!this.totalRendas && !this.totalDespesas) {
      this.insight = {
        title: 'Comece com o básico',
        message: 'Cadastre uma receita e uma despesa para liberar análises automáticas.',
        tone: 'info'
      };
      return;
    }

    if (!this.totalRendas && this.totalDespesas > 0) {
      this.insight = {
        title: 'Sem receita registrada',
        message: 'Cadastre uma receita para o saldo ficar correto.',
        tone: 'danger'
      };
      return;
    }

    const despesasVencidas = this.expensesRaw.filter((e) => {
      const data = parseLocaleDate(e.vencimento);
      const hoje = new Date();
      if (!data) return false;
      if (e.status && e.status !== 'OPEN' && e.status !== 'PARTIALLY_PAID') return false;
      return data < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    });
    if (despesasVencidas.length > 0) {
      this.insight = {
        title: 'Despesas vencidas em aberto',
        message: `Você tem ${despesasVencidas.length} despesa(s) vencida(s). Priorize o pagamento.`,
        tone: 'danger'
      };
      return;
    }

    if (this.saldo < 0) {
      this.insight = {
        title: 'Saldo negativo neste mês',
        message: 'Priorize cortar despesas variáveis ou antecipar receitas.',
        tone: 'danger'
      };
      return;
    }

    const taxaGasto = this.totalRendas ? this.totalDespesas / this.totalRendas : 0;
    if (taxaGasto > 0.85) {
      this.insight = {
        title: 'Despesas consumindo sua renda',
        message: 'Mais de 85% da sua renda já está comprometida neste mês.',
        tone: 'danger'
      };
      return;
    }

    if (taxaGasto > 0.7) {
      this.insight = {
        title: 'Despesas altas neste mês',
        message: 'Mais de 70% da sua renda já foi usada.',
        tone: 'warn'
      };
      return;
    }

    if (this.totalDividaCartoes > 0 && this.totalDividaCartoes > this.totalRendas * 0.3) {
      this.insight = {
        title: 'Cartões com saldo elevado',
        message: 'O total em cartões passou de 30% da sua renda do mês.',
        tone: 'warn'
      };
      return;
    }

    const mesIndex = this.dataAtual.getMonth();
    const atual = this.sumByMonthKey(this.expensesRaw, `${this.dataAtual.getFullYear()}-${String(mesIndex + 1).padStart(2, '0')}`);
    const anterior = this.sumByMonthKey(this.expensesRaw, `${this.dataAtual.getFullYear()}-${String(mesIndex).padStart(2, '0')}`);
    if (anterior > 0 && atual > anterior * 1.2) {
      this.insight = {
        title: 'Despesas subiram',
        message: 'Seus gastos aumentaram mais de 20% em relação ao mês anterior.',
        tone: 'warn'
      };
      return;
    }

    if (this.metasResumo.total === 0 && this.saldo > 0) {
      this.insight = {
        title: 'Defina uma meta para o ano',
        message: 'Com saldo positivo, você pode planejar um objetivo maior.',
        tone: 'info'
      };
      return;
    }

    this.insight = {
      title: 'Boa estabilidade no mês',
      message: 'Você manteve o saldo positivo e as despesas sob controle.',
      tone: 'ok'
    };
  }

}
