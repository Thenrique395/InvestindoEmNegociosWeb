import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiDataService, StoredExpense, StoredIncome, StoredCard } from './data/api-data.service';
import { CardsService } from './cards.service';
import { GoalsService, Goal } from './goals.service';
import { RouterModule } from '@angular/router';
import { expenseStatusLabel, incomeStatusLabel } from './utils/status';
import { parseDateDDMMYYYY } from './utils/input-mask';

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

  constructor(private db: ApiDataService, private goalsService: GoalsService, private cardsService: CardsService) {}

  ngOnInit(): void {
    this.subExpenses = this.db.expenses$.subscribe((lista) => {
      this.expensesRaw = lista;
      this.totalDespesas = this.somarDespesasMes(lista);
      this.atualizarSaldo();
      this.updateMonthlyData();
      this.atualizarDividaCartoes();
      this.updateRecentTransactions();
    });
    this.subIncomes = this.db.incomes$.subscribe((lista) => {
      this.incomesRaw = lista;
      this.totalRendas = this.somarRendasMes(lista);
      this.atualizarSaldo();
      this.updateMonthlyData();
      this.updateRecentTransactions();
    });
    this.subCards = this.db.cards$.subscribe((lista) => {
      const user = this.currentUser;
      this.cards = lista.filter((c) => (c.userId ? c.userId === user : true));
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

  get cardsCount(): number {
    return this.cards.length;
  }

  private atualizarDividaCartoes(): void {
    this.cardsService.debtTotal().subscribe({
      next: ({ total }) => (this.totalDividaCartoes = total ?? 0),
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

  private get currentUser(): string {
    if (typeof localStorage === 'undefined') return 'guest';
    return localStorage.getItem('current_user') || 'guest';
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

}
