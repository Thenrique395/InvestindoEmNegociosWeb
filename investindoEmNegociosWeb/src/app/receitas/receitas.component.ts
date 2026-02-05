import { Component, OnDestroy, OnInit } from '@angular/core';
import { DecimalPipe, NgIf, NgClass, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ApiDataService, IncomeSummaryState, StoredIncome } from '../data/api-data.service';
import { ReceitasListaComponent } from './receitas-lista.component';
import { ReceitasFormComponent } from './receitas-form.component';
import { maskDateDDMMYYYY, maskMoneyInput } from '../utils/input-mask';
import { AuthService } from '../auth.service';
import { GoalsService } from '../goals.service';
import { CategoriesService, CategoryDto } from '../categories.service';
import { hasAtLeastRole, UserRole } from '../roles';
import { incomeStatusLabel } from '../utils/status';
import {
  formatLocaleDate,
  formatMonthLabelFromKey,
  formatMonthYearLabel,
  formatNumberValue,
  monthKeyFromLocaleDate,
  parseLocaleDate,
  parseLocalizedNumber
} from '../utils/locale-utils';

@Component({
  selector: 'app-receitas',
  standalone: true,
  imports: [DecimalPipe, ReceitasListaComponent, ReceitasFormComponent, NgIf, NgClass, NgFor, FormsModule],
  templateUrl: './receitas.component.html',
  styleUrls: ['./receitas.component.scss']
})
export class ReceitasComponent implements OnInit, OnDestroy {
  dataAtual = new Date();
  rendasAll: StoredIncome[] = [];
  summary: IncomeSummaryState | null = null;
  mostrarForm = false;
  novaRenda: StoredIncome = this.criaRenda();
  valorInput = '';
  recebimentoInput = '';
  erroData = '';
  erroCategoria = '';
  editandoId: string | null = null;
  valorSugestao: number | null = null;
  saving = false;
  alerta = '';
  alertaTipo: 'info' | 'success' | 'error' = 'info';
  private alertaTimeout?: ReturnType<typeof setTimeout>;
  private sub?: Subscription;
  private summarySub?: Subscription;
  showDeleteModal = false;
  deletePlanId: string | null = null;
  deleteInstallmentId: string | null = null;
  deleteFonte = '';
  deleteIsRecurring = false;
  showEditReceivedModal = false;
  editReceivedId: string | null = null;
  editReceivedSource = '';
  selectedIds = new Set<string>();
  loadingRecebido = false;
  filtroTexto = '';
  filtroTipo: 'all' | 'recurring' | 'oneTime' = 'all';
  filtroStatus: 'all' | 'paid' | 'pending' = 'all';
  goalInput = '';
  goalValue: number | null = null;
  categorias: CategoryDto[] = [];

  constructor(
    private db: ApiDataService,
    private authService: AuthService,
    private goalsService: GoalsService,
    private categoriesService: CategoriesService
  ) {}

  ngOnInit(): void {
    this.db.refreshIncomes(this.mesKey());
    this.loadGoal();
    this.loadCategorias();
    this.sub = this.db.incomes$.subscribe((lista) => {
      this.rendasAll = [...lista];
      this.valorSugestao = this.getUltimoValorParaFonte(this.novaRenda.fonte);
    });
    this.summarySub = this.db.incomeSummary$.subscribe((summary) => {
      this.summary = summary;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.summarySub?.unsubscribe();
  }

  get currentRole(): UserRole | null {
    return this.authService.getRole();
  }

  hasAccess(minRole: UserRole): boolean {
    return hasAtLeastRole(this.currentRole, minRole);
  }

  get selecionados(): string[] {
    return Array.from(this.selectedIds);
  }

  get selecionadosRecebiveis(): StoredIncome[] {
    return this.rendas.filter((r) => this.selectedIds.has(r.id) && r.status !== 'PAID' && r.status !== 'CANCELED');
  }

  get rendas(): StoredIncome[] {
    const key = this.mesKey();
    const filtradas = this.rendasAll
      .filter((r) => this.mesKeyFromRecebimento(r.recebimento) === key)
      .filter((r) => this.filtroTextoMatch(r))
      .filter((r) => this.filtroTipoMatch(r))
      .filter((r) => this.filtroStatusMatch(r));
    return filtradas.sort((a, b) => this.compareDateDesc(a.recebimento, b.recebimento));
  }

  get rendasMes(): StoredIncome[] {
    const key = this.mesKey();
    const filtradas = this.rendasAll.filter((r) => this.mesKeyFromRecebimento(r.recebimento) === key);
    return filtradas.sort((a, b) => this.compareDateDesc(a.recebimento, b.recebimento));
  }

  get resumoTexto(): string {
    if (!this.valorInput) return '';
    const valor = this.valorInput;
    const data = this.recebimentoInput || 'DD/MM/AAAA';
    if (this.novaRenda.fixa) {
      return `Recebimento de ${valor} todos os meses a partir de ${data}.`;
    }
    return `Recebimento de ${valor} em ${data}.`;
  }

  get totalRendas(): number {
    if (this.summary) return this.summary.total;
    return this.rendasMes.reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  get totalRecorrentes(): number {
    if (this.summary) return this.summary.totalRecurring;
    return this.rendasMes.filter((r) => r.fixa).reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  get totalAvulsas(): number {
    if (this.summary) return this.summary.totalOneTime;
    return this.rendasMes.filter((r) => !r.fixa).reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  get statusResumo(): { pagos: number; pendentes: number; pagosValor: number; pendentesValor: number } {
    let pagos = 0;
    let pendentes = 0;
    let pagosValor = 0;
    let pendentesValor = 0;

    for (const renda of this.rendasMes) {
      const status = incomeStatusLabel(renda.status);
      if (status === 'Recebido') {
        pagos += 1;
        pagosValor += renda.valor || 0;
      } else {
        pendentes += 1;
        pendentesValor += renda.valor || 0;
      }
    }

    return { pagos, pendentes, pagosValor, pendentesValor };
  }

  get topFontes(): { fonte: string; total: number }[] {
    const map = new Map<string, number>();
    for (const renda of this.rendasMes) {
      const key = renda.fonte || 'Sem fonte';
      map.set(key, (map.get(key) ?? 0) + (renda.valor || 0));
    }
    return Array.from(map.entries())
      .map(([fonte, total]) => ({ fonte, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  get historyData(): IncomeSummaryState['history'] {
    return this.summary?.history ?? [];
  }

  get historyMax(): number {
    return Math.max(...this.historyData.map((h) => h.total), 0);
  }

  get previousDelta(): { total: number; percent: number } | null {
    if (!this.summary?.previousMonth) return null;
    const prev = this.summary.previousMonth.total;
    const current = this.summary.total;
    if (!prev) return { total: current, percent: current ? 100 : 0 };
    return { total: current - prev, percent: ((current - prev) / prev) * 100 };
  }

  get previousComparison(): {
    month: string;
    delta: number;
    deltaAbs: number;
    percent: number;
    trend: 'up' | 'down' | 'flat';
    isNew: boolean;
  } | null {
    if (!this.summary?.previousMonth) return null;
    const prev = this.summary.previousMonth.total;
    const current = this.summary.total;
    const delta = current - prev;
    const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const isNew = prev === 0 && current > 0;
    const percent = prev === 0 ? (current ? 100 : 0) : (delta / prev) * 100;
    return {
      month: this.formatMonthLabel(this.summary.previousMonth.month),
      delta,
      deltaAbs: Math.abs(delta),
      percent,
      trend,
      isNew
    };
  }

  private formatMonthLabel(value: string): string {
    return formatMonthLabelFromKey(value, 'long');
  }

  get adminInsights(): { label: string; value: number }[] {
    const semData = this.rendasMes.filter((r) => !r.recebimento).length;
    const semFonte = this.rendasMes.filter((r) => !r.fonte).length;
    const recorrentes = this.rendasMes.filter((r) => r.fixa).length;
    const fontesDuplicadas = this.countDuplicatedSources();
    return [
      { label: 'Receitas sem data', value: semData },
      { label: 'Receitas sem fonte', value: semFonte },
      { label: 'Recorrentes ativas', value: recorrentes },
      { label: 'Fontes duplicadas', value: fontesDuplicadas }
    ];
  }

  get mesAtualLabel(): string {
    return formatMonthYearLabel(this.dataAtual);
  }

  get goalProgress(): number {
    if (!this.goalValue) return 0;
    return Math.min(100, (this.totalRendas / this.goalValue) * 100);
  }

  get goalRemaining(): number {
    if (!this.goalValue) return 0;
    return Math.max(0, this.goalValue - this.totalRendas);
  }

  get advancedAlerts(): { type: 'info' | 'warning' | 'success' | 'danger'; title: string; message: string }[] {
    const alerts: { type: 'info' | 'warning' | 'success' | 'danger'; title: string; message: string }[] = [];
    if (this.statusResumo.pendentes > 0) {
      alerts.push({
        type: 'info',
        title: 'Receitas pendentes',
        message: `Você tem ${this.statusResumo.pendentes} lançamento(s) pendente(s) neste mês.`
      });
    }
    if (this.previousComparison && this.previousComparison.trend === 'down') {
      alerts.push({
        type: 'warning',
        title: 'Receitas caíram',
        message: `Queda de ${this.previousComparison.percent.toFixed(0)}% em relação a ${this.previousComparison.month}.`
      });
    }
    if (this.goalValue) {
      if (this.goalRemaining > 0) {
        alerts.push({
          type: 'warning',
          title: 'Meta não atingida',
          message: `Faltam R$ ${this.goalRemaining.toFixed(2).replace('.', ',')} para a meta do mês.`
        });
      } else {
        alerts.push({
          type: 'success',
          title: 'Meta atingida',
          message: 'Parabéns! Você já superou a meta de receita.'
        });
      }
    }
    if (this.totalRendas === 0) {
      alerts.push({
        type: 'danger',
        title: 'Sem receitas no mês',
        message: 'Nenhuma receita registrada. Cadastre ao menos uma fonte recorrente.'
      });
    }
    return alerts.slice(0, 3);
  }

  abrirModal(): void {
    if (this.saving) return;
    this.resetarForm();
    this.mostrarForm = true;
  }

  fecharModal(): void {
    if (this.saving) return;
    this.mostrarForm = false;
    this.resetarForm();
  }

  salvar(): void {
    if (this.saving) return;
    const valor = this.parseValor(this.valorInput);
    if (!this.novaRenda.fonte || !valor) return;

    if (!this.novaRenda.categoryId) {
      this.erroCategoria = 'Selecione uma categoria.';
      return;
    }
    this.erroCategoria = '';

    if (!this.recebimentoInput || !this.isDataValida(this.recebimentoInput)) {
      this.erroData = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }
    this.erroData = '';
    const recebimentoNormalizado = this.recebimentoInput
      ? this.normalizaData(this.recebimentoInput)
      : this.formatDate(this.dataAtual);

    this.saving = true;
    let ok = false;
    try {
      if (this.editandoId) {
        this.db.updateIncome(this.editandoId, {
          planId: this.editandoId,
          fonte: this.novaRenda.fonte,
          categoryId: this.novaRenda.categoryId ?? null,
          valor,
          recebimento: recebimentoNormalizado,
          fixa: this.novaRenda.fixa
        });
      } else {
        this.db.addIncome({
          planId: '',
          fonte: this.novaRenda.fonte,
          categoryId: this.novaRenda.categoryId ?? null,
          valor,
          recebimento: recebimentoNormalizado,
          fixa: this.novaRenda.fixa
        });
      }

      ok = true;
    } finally {
      this.saving = false;
      if (ok) {
        this.setAlerta('Receita salva com sucesso.', 2500, 'success');
        this.fecharModal();
      }
    }
  }

  editar(renda: StoredIncome): void {
    this.editandoId = renda.planId ?? null;
    this.novaRenda = { ...renda };
    this.valorInput = formatNumberValue(renda.valor);
    this.recebimentoInput = renda.recebimento;
    this.valorSugestao = this.getUltimoValorParaFonte(renda.fonte);
    this.mostrarForm = true;
  }

  remover(payload: { planId?: string; installmentId: string }): void {
    const renda = this.rendasAll.find((r) => r.id === payload.installmentId);
    if (!renda) return;

    this.deletePlanId = payload.planId || null;
    this.deleteInstallmentId = payload.installmentId;
    this.deleteFonte = renda.fonte;
    this.deleteIsRecurring = renda.schedule === 'Recurring';
    this.showDeleteModal = true;
  }

  editarPorId(id: string): void {
    const renda = this.rendasAll.find((r) => r.id === id);
    if (renda) {
      if (renda.status === 'PAID') {
        this.editReceivedId = renda.id;
        this.editReceivedSource = renda.fonte || 'Receita';
        this.showEditReceivedModal = true;
        return;
      }
      this.editar(renda);
    }
  }

  confirmarExcluirSomenteEsta(): void {
    if (!this.deleteInstallmentId) return;
    this.db.removeIncomeInstallment(this.deleteInstallmentId);
    this.fecharModalExcluir();
  }

  confirmarExcluirRecorrencia(): void {
    if (!this.deletePlanId) return;
    this.db.removeIncome(this.deletePlanId);
    this.fecharModalExcluir();
  }

  fecharModalExcluir(): void {
    this.showDeleteModal = false;
    this.deletePlanId = null;
    this.deleteInstallmentId = null;
    this.deleteFonte = '';
    this.deleteIsRecurring = false;
  }

  confirmarEdicaoRecebida(): void {
    if (!this.editReceivedId) return;
    const renda = this.rendasAll.find((r) => r.id === this.editReceivedId);
    if (!renda) {
      this.cancelarEdicaoRecebida();
      return;
    }
    this.db.setIncomeStatusLocal(this.editReceivedId, 'OPEN');
    this.cancelarEdicaoRecebida();
    this.editar(renda);
  }

  cancelarEdicaoRecebida(): void {
    this.showEditReceivedModal = false;
    this.editReceivedId = null;
    this.editReceivedSource = '';
  }

  toggleSelecionar(id: string, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  toggleSelecionarTodos(checked: boolean): void {
    if (checked) {
      const ids = (this.rendas || []).map((r) => r.id).filter(Boolean) as string[];
      this.selectedIds = new Set(ids);
    } else {
      this.selectedIds.clear();
    }
  }

  marcarRecebidasSelecionadas(): void {
    const selecionadas = this.selecionadosRecebiveis;
    if (!selecionadas.length) {
      this.setAlerta('Nenhuma receita selecionada para marcar como recebida.', 2000);
      return;
    }
    const pedidos = selecionadas.map((r) => this.db.markIncomeReceived(r.id, r.valor));
    this.loadingRecebido = true;
    forkJoin(pedidos)
      .pipe(finalize(() => (this.loadingRecebido = false)))
      .subscribe({
        next: () => {
          this.selectedIds.clear();
          this.setAlerta('Receitas marcadas como recebidas.', 2500, 'success');
        },
        error: () => {
          this.setAlerta('Falha ao marcar receitas como recebidas.', 2500, 'error');
        }
      });
  }

  onValorChange(raw: string): void {
    this.valorInput = maskMoneyInput(raw);
  }

  onRecebimentoChange(raw: string): void {
    this.recebimentoInput = maskDateDDMMYYYY(raw);
    this.erroData = !this.recebimentoInput || this.isDataValida(this.recebimentoInput)
      ? ''
      : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  onFonteChange(fonte: string): void {
    this.novaRenda.fonte = fonte;
    this.valorSugestao = this.getUltimoValorParaFonte(fonte);
  }

  aplicarSugestao(): void {
    if (!this.valorSugestao) return;
    this.valorInput = formatNumberValue(this.valorSugestao);
  }

  private resetarForm(): void {
    this.novaRenda = this.criaRenda();
    this.valorInput = '';
    this.recebimentoInput = '';
    this.editandoId = null;
    this.erroData = '';
    this.erroCategoria = '';
    this.valorSugestao = null;
  }

  private setAlerta(msg: string, duracao = 3000, tipo: 'info' | 'success' | 'error' = 'info'): void {
    this.alerta = msg;
    this.alertaTipo = tipo;
    if (this.alertaTimeout) clearTimeout(this.alertaTimeout);
    this.alertaTimeout = setTimeout(() => (this.alerta = ''), duracao);
  }

  private criaRenda(): StoredIncome {
    return {
      id: '',
      planId: '',
      fonte: '',
      categoria: '',
      categoryId: null,
      valor: 0,
      recebimento: '',
      fixa: false,
      fixaInicio: ''
    };
  }

  private normalizaData(value: string): string {
    return maskDateDDMMYYYY(value);
  }

  private loadGoal(): void {
    const year = this.dataAtual.getFullYear();
    this.goalsService.getIncomeGoal(year).subscribe({
      next: (goal) => {
        if (!goal || !goal.expectedMonthly) {
          this.goalValue = null;
          this.goalInput = '';
          return;
        }
        this.goalValue = goal.expectedMonthly;
        this.goalInput = formatNumberValue(goal.expectedMonthly);
      },
      error: () => {
        this.goalValue = null;
        this.goalInput = '';
        this.setAlerta('Falha ao carregar a meta de receita.', 2500, 'error');
      }
    });
  }

  private loadCategorias(): void {
    const filtraReceitas = (items: CategoryDto[]) => {
      const active = (items || []).filter((item) => item.isActive !== false);
      return active.filter((item) => {
        const applies = (item.appliesTo || '').toString().toLowerCase().trim();
        return applies.includes('income') || applies.includes('receita') || applies.includes('renda');
      });
    };

    this.categoriesService.list('Income').subscribe({
      next: (items) => {
        const filtradas = filtraReceitas(items || []);
        if (filtradas.length) {
          this.categorias = filtradas;
          return;
        }
        this.categoriesService.list().subscribe({
          next: (all) => {
            this.categorias = filtraReceitas(all || []);
          },
          error: (err) => {
            console.error('Falha ao carregar categorias de receita', err);
            this.categorias = [];
          }
        });
      },
      error: (err) => {
        console.error('Falha ao carregar categorias de receita', err);
        this.categorias = [];
      }
    });
  }

  private parseValor(value: string | number): number {
    return parseLocalizedNumber(value);
  }

  private isDataValida(value: string): boolean {
    return !!parseLocaleDate(value);
  }

  private compareDateDesc(a: string, b: string): number {
    const da = this.parseData(a);
    const db = this.parseData(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db.getTime() - da.getTime();
  }

  private parseData(value: string): Date | null {
    return parseLocaleDate(value);
  }

  private formatDate(date: Date): string {
    return formatLocaleDate(date);
  }

  private getUltimoValorParaFonte(fonte: string): number | null {
    if (!fonte) return null;
    const needle = fonte.trim().toLowerCase();
    const candidatas = this.rendasAll.filter((r) => (r.fonte || '').trim().toLowerCase() === needle);
    if (!candidatas.length) return null;
    const ordenadas = [...candidatas].sort((a, b) => this.compareDateDesc(a.recebimento, b.recebimento));
    return ordenadas[0].valor;
  }

  mesAnterior(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
    this.db.refreshIncomes(this.mesKey());
    this.loadGoal();
  }

  proximoMes(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() + 1, 1);
    this.db.refreshIncomes(this.mesKey());
    this.loadGoal();
  }

  applyGoal(): void {
    const value = this.parseValor(this.goalInput);
    if (!value || value <= 0) {
      this.setAlerta('Informe um valor mensal válido para a meta.', 2500, 'error');
      return;
    }
    const year = this.dataAtual.getFullYear();
    this.goalsService.upsertIncomeGoal(year, value).subscribe({
      next: (goal) => {
        this.goalValue = goal.expectedMonthly;
        this.goalInput = formatNumberValue(goal.expectedMonthly);
        this.setAlerta('Meta atualizada com sucesso.', 2500, 'success');
      },
      error: (err) => {
        this.setAlerta('Falha ao salvar a meta. Tente novamente.', 2500, 'error');
        console.error(err);
      }
    });
  }

  exportCsv(): void {
    const rows = [
      ['Fonte', 'Categoria', 'Valor', 'Recebimento', 'Tipo', 'Status'],
      ...this.rendasMes.map((r) => [
        r.fonte || '',
        r.categoria || '',
        r.valor.toFixed(2).replace('.', ','),
        r.recebimento || '',
        r.fixa ? 'Recorrente' : 'Avulsa',
        incomeStatusLabel(r.status)
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receitas-${this.mesKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    const rootStyles = window.getComputedStyle(document.documentElement);
    const textColor = rootStyles.getPropertyValue('--text').trim();
    const borderColor = rootStyles.getPropertyValue('--border').trim();
    const headerBg = rootStyles.getPropertyValue('--surface-2').trim();

    const rows = this.rendasMes
      .map(
        (r) => `
        <tr>
          <td>${r.fonte || '-'}</td>
          <td>${r.categoria || '-'}</td>
          <td>R$ ${r.valor.toFixed(2).replace('.', ',')}</td>
          <td>${r.recebimento || '-'}</td>
          <td>${r.fixa ? 'Recorrente' : 'Avulsa'}</td>
          <td>${incomeStatusLabel(r.status)}</td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receitas ${this.mesAtualLabel}</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; color: ${textColor}; }
            h1 { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border-bottom: 1px solid ${borderColor}; text-align: left; }
            th { background: ${headerBg}; }
          </style>
        </head>
        <body>
          <h1>Receitas - ${this.mesAtualLabel}</h1>
          <p>Total do mês: R$ ${this.totalRendas.toFixed(2).replace('.', ',')}</p>
          <table>
            <thead>
              <tr>
                <th>Fonte</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Recebimento</th>
                <th>Tipo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  private mesKey(): string {
    const y = this.dataAtual.getFullYear();
    const m = this.dataAtual.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  private mesKeyFromRecebimento(recebimento: string): string | null {
    return monthKeyFromLocaleDate(recebimento);
  }

  private mesKeyBetween(target: string, inicio: string, fim: string | null): boolean {
    const t = target;
    if (t < inicio) return false;
    if (fim && t > fim) return false;
    return true;
  }

  private filtroTextoMatch(renda: StoredIncome): boolean {
    if (!this.filtroTexto) return true;
    return (renda.fonte || '').toLowerCase().includes(this.filtroTexto.trim().toLowerCase());
  }

  private filtroTipoMatch(renda: StoredIncome): boolean {
    if (this.filtroTipo === 'all') return true;
    if (this.filtroTipo === 'recurring') return !!renda.fixa;
    return !renda.fixa;
  }

  private filtroStatusMatch(renda: StoredIncome): boolean {
    if (this.filtroStatus === 'all') return true;
    const status = incomeStatusLabel(renda.status);
    if (this.filtroStatus === 'paid') return status === 'Recebido';
    return status !== 'Recebido';
  }

  private countDuplicatedSources(): number {
    const counter = new Map<string, number>();
    for (const renda of this.rendasMes) {
      const key = (renda.fonte || '').trim().toLowerCase();
      if (!key) continue;
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }
    return Array.from(counter.values()).filter((count) => count > 1).length;
  }
}
