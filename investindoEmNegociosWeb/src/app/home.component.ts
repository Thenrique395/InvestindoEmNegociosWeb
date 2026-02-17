import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredExpense, StoredIncome, StoredCard } from './data/api-data.service';
import { CardsService } from './cards.service';
import { GoalsService, Goal, GoalStatus } from './goals.service';
import { RouterModule } from '@angular/router';
import { expenseStatusLabel, incomeStatusLabel } from './utils/status';
import { OnboardingService } from './onboarding.service';
import { formatMonthYearLabel, monthKeyFromLocaleDate, parseLocaleDate } from './utils/locale-utils';

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
  private expensesRaw: StoredExpense[] = [];
  private incomesRaw: StoredIncome[] = [];
  totalRendas = 0;
  totalDespesas = 0;
  saldo = 0;
  periodo: 'month' | 'quarter' | 'year' = 'month';
  cards: StoredCard[] = [];
  totalDividaCartoes = 0;
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
      .filter((r) => this.isDateInRange(r.recebimento, range))
      .reduce((sum, r) => sum + (r.valor || 0), 0);
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
  trackByIndex(index: number): number {
    return index;
  }

}
