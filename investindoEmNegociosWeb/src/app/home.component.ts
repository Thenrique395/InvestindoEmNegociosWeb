import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredExpense, StoredIncome, StoredCard } from './data/api-data.service';
import { CardsService } from './cards.service';
import { GoalsService, Goal } from './goals.service';
import { RouterModule } from '@angular/router';
import { expenseStatusLabel, incomeStatusLabel } from './utils/status';
import { parseDateDDMMYYYY } from './utils/input-mask';
import { OnboardingService } from './onboarding.service';

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
  cards: StoredCard[] = [];
  totalDividaCartoes = 0;
  monthlyData: { label: string; incomes: number; expenses: number }[] = [];
  maxMonthlyValue = 0;
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
        },
        error: () => {
          this.onboardingStep = 0;
          this.onboardingDone = false;
          this.hideOnboarding = false;
        }
      });
    }
    this.subExpenses = this.db.expenses$.subscribe((lista) => {
      this.expensesLoaded = true;
      this.expensesRaw = lista;
      this.totalDespesas = this.somarDespesasMes(lista);
      this.atualizarSaldo();
      this.updateMonthlyData();
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
    return this.dataAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }

  get isLoadingDashboard(): boolean {
    return !(this.expensesLoaded && this.incomesLoaded);
  }

  get hasChartData(): boolean {
    return this.monthlyData.some((m) => (m.incomes || 0) > 0 || (m.expenses || 0) > 0);
  }

  get showOnboarding(): boolean {
    return this.isLogged && !this.onboardingDone && !this.onboardingDismissed;
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

  private somarDespesasMes(lista: StoredExpense[], key = this.mesKey()): number {
    return lista
      .filter((d) => this.mesKeyFromVencimento(d.vencimento) === key)
      .reduce((sum, d) => sum + (d.valor || 0), 0);
  }

  private somarRendasMes(lista: StoredIncome[], key = this.mesKey()): number {
    return lista
      .filter((r) => this.mesKeyFromRecebimento(r.recebimento) === key)
      .reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  private updateMonthlyData(): void {
    const ano = this.dataAtual.getFullYear();
    const months = Array.from({ length: 12 }).map((_, idx) => {
      const label = new Date(ano, idx, 1).toLocaleString('pt-BR', { month: 'short' });
      const key = `${ano}-${String(idx + 1).padStart(2, '0')}`;
      const incomes = this.somarRendasMes(this.incomesRaw, key);
      const expenses = this.somarDespesasMes(this.expensesRaw, key);
      return { label, incomes, expenses };
    });
    this.monthlyData = months;
    this.maxMonthlyValue = Math.max(...months.map((m) => Math.max(m.incomes, m.expenses, 0)), 0);
    this.updatePolylineData();
  }

  private updateRecentTransactions(): void {
    const expenseItems = this.expensesRaw.map((e) => ({
      id: e.id,
      title: e.nome || 'Despesa',
      date: e.vencimento || '—',
      amount: e.valor || 0,
      type: 'expense' as const,
      status: expenseStatusLabel(e.status)
    }));
    const incomeItems = this.incomesRaw.map((i) => ({
      id: i.id,
      title: i.fonte || 'Receita',
      date: i.recebimento || '—',
      amount: i.valor || 0,
      type: 'income' as const,
      status: incomeStatusLabel(i.recebimento)
    }));
    const all = [...expenseItems, ...incomeItems];
    all.sort((a, b) => {
      const da = parseDateDDMMYYYY(a.date)?.getTime() || 0;
      const db = parseDateDDMMYYYY(b.date)?.getTime() || 0;
      return db - da;
    });
    this.recentTransactions = all.slice(0, 6);
  }

  nextOnboarding(): void {
    if (this.onboardingStep >= 2) {
      this.finishOnboarding();
      return;
    }
    this.onboardingStep += 1;
    this.persistOnboarding();
  }

  skipOnboarding(): void {
    this.finishOnboarding();
  }

  dismissOnboarding(): void {
    this.onboardingDismissed = true;
  }

  toggleHideOnboarding(checked: boolean): void {
    this.hideOnboarding = checked;
    if (checked) {
      this.finishOnboarding();
    }
  }

  private finishOnboarding(): void {
    this.onboardingDone = true;
    this.onboardingStep = 2;
    this.persistOnboarding();
  }

  private persistOnboarding(): void {
    this.onboardingService.updateStatus({ step: this.onboardingStep, completed: this.onboardingDone }).subscribe({
      error: () => {
        /* ignore */
      }
    });
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
    const width = 1100;
    const height = 200;
    const padding = 14;
    const usableW = width - padding * 2;
    const usableH = height - padding * 2;
    const max = this.maxMonthlyValue || 1;
    const len = this.monthlyData.length || 1;
    const step = len > 1 ? usableW / (len - 1) : usableW;

    const build = (field: 'incomes' | 'expenses') => {
      const points = this.monthlyData.map((m, idx) => {
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
    this.incomesPolyline = incomesData.polyline;
    this.expensesPolyline = expensesData.polyline;
    this.incomesPoints = incomesData.points;
    this.expensesPoints = expensesData.points;
  }

  private mesKey(): string {
    const y = this.dataAtual.getFullYear();
    const m = this.dataAtual.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  private mesKeyFromVencimento(vencimento: string): string | null {
    const digits = vencimento?.replace(/[^\d]/g, '') || '';
    if (digits.length < 8) return null;
    const mes = digits.slice(2, 4);
    const ano = digits.slice(4, 8);
    return `${ano}-${mes}`;
  }

  private mesKeyFromRecebimento(recebimento: string): string | null {
    const digits = recebimento?.replace(/[^\d]/g, '') || '';
    if (digits.length < 8) return null;
    const mes = digits.slice(2, 4);
    const ano = digits.slice(4, 8);
    return `${ano}-${mes}`;
  }

  private mesKeyFromMes(mesAno?: string): string | null {
    if (!mesAno) return null;
    const digits = mesAno.replace(/[^\d]/g, '');
    if (digits.length < 6) return null;
    const mes = digits.slice(0, 2);
    const ano = digits.slice(2, 6);
    return `${ano}-${mes}`;
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

    if (this.saldo < 0) {
      this.insight = {
        title: 'Saldo negativo neste mês',
        message: 'Priorize cortar despesas variáveis ou antecipar receitas.',
        tone: 'danger'
      };
      return;
    }

    const taxaGasto = this.totalRendas ? this.totalDespesas / this.totalRendas : 0;
    if (taxaGasto > 0.75) {
      this.insight = {
        title: 'Despesas consumindo sua renda',
        message: 'Mais de 75% da sua renda já está comprometida neste mês.',
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

    this.insight = {
      title: 'Boa estabilidade no mês',
      message: 'Você manteve o saldo positivo e as despesas sob controle.',
      tone: 'ok'
    };
  }

}
