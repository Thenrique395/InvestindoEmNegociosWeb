import { Component, OnDestroy, OnInit } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ApiDataService, IncomeSummaryState, StoredIncome } from '../data/api-data.service';
import { ReceitasListaComponent } from './receitas-lista.component';
import { ReceitasFormComponent } from './receitas-form.component';
import { maskDateDDMMYYYY, maskMoneyInput } from '../utils/input-mask';
import { AuthService } from '../auth.service';
import { CategoriesService, CategoryDto } from '../categories.service';
import { hasAtLeastRole, UserRole } from '../roles';
import { incomeStatusLabel } from '../utils/status';
import { UiFeedbackService } from '../ui-feedback.service';
import { AccountsService, AccountResponse } from '../accounts.service';
import { TooltipComponent } from '../shared/tooltip/tooltip.component';
import { StatCardComponent } from '../shared/stat-card/stat-card.component';
import { ComparisonPillComponent } from '../shared/comparison-pill/comparison-pill.component';
import { PeriodTotalCardComponent } from '../shared/period-total-card/period-total-card.component';
import { PeriodHeroComponent } from '../shared/period-hero/period-hero.component';
import {
  formatLocaleDate,
  formatMonthYearLabel,
  formatNumberValue,
  monthKeyFromLocaleDate,
  parseLocaleDate,
  parseLocalizedNumber
} from '../utils/locale-utils';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';

@Component({
  selector: 'app-receitas',
  standalone: true,
  imports: [DecimalPipe, ReceitasListaComponent, ReceitasFormComponent, NgClass, FormsModule, TooltipComponent, StatCardComponent, ComparisonPillComponent, PeriodTotalCardComponent, PeriodHeroComponent, AppCurrencyPipe],
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
  private alertaTimeout?: ReturnType<typeof setTimeout>;
  private sub?: Subscription;
  private summarySub?: Subscription;
  private incomesLoadingSub?: Subscription;
  private routeSub?: Subscription;
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
  loadingMes = true;
  contas: AccountResponse[] = [];
  contaBaixaId: string | null = null;
  private contasCarregadas = false;
  private carregandoContas = false;
  filtroTexto = '';
  filtroTipo: 'all' | 'recurring' | 'oneTime' = 'all';
  filtroStatus: 'all' | 'paid' | 'pending' = 'all';
  focusMode: 'none' | 'pending' = 'none';
  sortBy: 'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status' | null = null;
  sortDir: 1 | -1 = 1;
  categorias: CategoryDto[] = [];

  constructor(
    private db: ApiDataService,
    private authService: AuthService,
    private categoriesService: CategoriesService,
    private uiFeedback: UiFeedbackService,
    private accountsService: AccountsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      const focus = (params.get('focus') || '').toLowerCase();
      if (focus === 'pending') {
        this.focusMode = 'pending';
        this.filtroStatus = 'pending';
      } else {
        this.focusMode = 'none';
      }
    });

    this.loadingMes = true;
    this.db.refreshIncomes(this.mesKey());
    this.loadCategorias();
    this.sub = this.db.incomes$.subscribe((lista) => {
      this.rendasAll = [...lista];
      this.valorSugestao = this.getUltimoValorParaFonte(this.novaRenda.fonte);
    });
    this.summarySub = this.db.incomeSummary$.subscribe((summary) => {
      this.summary = summary;
    });
    this.incomesLoadingSub = this.db.incomesLoading$.subscribe((loading) => {
      this.loadingMes = loading;
    });

  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.summarySub?.unsubscribe();
    this.incomesLoadingSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  get currentRole(): UserRole | null {
    return this.authService.getRole();
  }

  get canChooseAccount(): boolean {
    return hasAtLeastRole(this.currentRole, 'Intermediate');
  }

  hasAccess(minRole: UserRole): boolean {
    return hasAtLeastRole(this.currentRole, minRole);
  }

  get selecionados(): string[] {
    const visiveisSelecionaveis = new Set(
      this.rendas
        .filter((r) => r.status !== 'PAID' && r.status !== 'CANCELED')
        .map((r) => r.id)
        .filter((id): id is string => !!id)
    );
    return Array.from(this.selectedIds).filter((id) => visiveisSelecionaveis.has(id));
  }

  get selecionadosRecebiveis(): StoredIncome[] {
    const selecionados = new Set(this.selecionados);
    return this.rendas.filter((r) => selecionados.has(r.id) && r.status !== 'PAID' && r.status !== 'CANCELED');
  }

  get rendas(): StoredIncome[] {
    const key = this.mesKey();
    const filtradas = this.rendasAll
      .filter((r) => this.mesKeyFromRecebimento(r.recebimento) === key)
      .filter((r) => this.filtroTextoMatch(r))
      .filter((r) => this.filtroTipoMatch(r))
      .filter((r) => this.filtroStatusMatch(r));
    if (!this.sortBy) {
      return filtradas.sort((a, b) => this.compareDateDesc(a.recebimento, b.recebimento));
    }
    const compare = (a: StoredIncome, b: StoredIncome) => {
      switch (this.sortBy) {
        case 'fonte':
          return this.collate(a.fonte, b.fonte);
        case 'categoria':
          return this.collate(a.categoria, b.categoria);
        case 'valor':
          return (a.valor || 0) - (b.valor || 0);
        case 'recebimento':
          return this.compareDate(a.recebimento, b.recebimento);
        case 'tipo':
          return this.collate(a.fixa ? 'Recorrente' : 'Avulsa', b.fixa ? 'Recorrente' : 'Avulsa');
        case 'status':
          return this.collate(incomeStatusLabel(a.status), incomeStatusLabel(b.status));
        default:
          return 0;
      }
    };
    return filtradas.sort((a, b) => compare(a, b) * this.sortDir);
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

  get previousComparison(): { month: string; monthLabel: string; delta: number; deltaAbs: number; percent: number; trend: 'up' | 'down' | 'flat'; isNew: boolean } {
    const prevDate = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
    const summaryPrev = this.summary?.previousMonth;
    const prevTotal = summaryPrev ? summaryPrev.total : 0;
    const currentTotal = this.summary ? this.summary.total : this.totalRendas;
    const delta = currentTotal - prevTotal;
    const isNew = prevTotal === 0 && currentTotal > 0;
    const percent = prevTotal > 0 ? (delta / prevTotal) * 100 : 0;
    const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    return {
      month: summaryPrev ? summaryPrev.month : formatMonthYearLabel(prevDate),
      monthLabel: summaryPrev ? this.formatMonthLabel(summaryPrev.month) : formatMonthYearLabel(prevDate),
      delta,
      deltaAbs: Math.abs(delta),
      percent: Math.abs(percent),
      trend,
      isNew
    };
  }

  get mesAtualLabel(): string {
    return formatMonthYearLabel(this.dataAtual);
  }

  get focusBadgeLabel(): string {
    if (this.focusMode === 'pending') return 'Filtro automático: receitas pendentes';
    return '';
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
      this.ensureContasCarregadas();
    } else {
      this.selectedIds.delete(id);
    }
  }

  toggleSelecionarTodos(checked: boolean): void {
    if (checked) {
      const ids = (this.rendas || [])
        .filter((r) => r.status !== 'PAID' && r.status !== 'CANCELED')
        .map((r) => r.id)
        .filter((id): id is string => !!id);
      this.selectedIds = new Set(ids);
      this.ensureContasCarregadas();
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
    if (this.canChooseAccount && !this.contaBaixaId) {
      this.ensureContasCarregadas();
      this.setAlerta('Selecione uma conta ativa para registrar os recebimentos.', 3000, 'error');
      return;
    }
    if (this.canChooseAccount) {
      this.accountsService.setDefaultAccountId(this.contaBaixaId);
    }
    const accountId = this.canChooseAccount ? this.contaBaixaId : null;
    const pedidos = selecionadas.map((r) => this.db.markIncomeReceived(r.id, r.valor, accountId));
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
    if (this.alertaTimeout) clearTimeout(this.alertaTimeout);
    if (tipo === 'success') this.uiFeedback.success(msg, duracao);
    if (tipo === 'error') this.uiFeedback.error(msg, duracao);
    if (tipo === 'info') this.uiFeedback.info(msg, duracao);
    this.alertaTimeout = setTimeout(() => {
      /* noop */
    }, duracao);
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

  private compareDate(a: string, b: string): number {
    const da = this.parseData(a);
    const db = this.parseData(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  }

  private collate(a?: string | null, b?: string | null): number {
    const aa = (a || '').toString().toLowerCase();
    const bb = (b || '').toString().toLowerCase();
    return aa.localeCompare(bb, 'pt-BR');
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

  private ensureContasCarregadas(): void {
    if (!this.canChooseAccount || this.contasCarregadas || this.carregandoContas) return;
    this.carregandoContas = true;
    this.accountsService.list().subscribe({
      next: (items) => {
        this.contas = (items || []).filter((c) => c.isActive);
        this.contaBaixaId = this.accountsService.resolveDefaultAccountId(this.contas);
        this.contasCarregadas = true;
        this.carregandoContas = false;
      },
      error: () => {
        this.contas = [];
        this.contaBaixaId = null;
        this.accountsService.setDefaultAccountId(null);
        this.carregandoContas = false;
      }
    });
  }

  mesAnterior(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
    this.loadingMes = true;
    this.db.refreshIncomes(this.mesKey());
  }

  proximoMes(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() + 1, 1);
    this.loadingMes = true;
    this.db.refreshIncomes(this.mesKey());
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

  ordenarPor(campo: 'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status'): void {
    if (this.sortBy === campo) {
      this.sortDir = this.sortDir === 1 ? -1 : 1;
      return;
    }
    this.sortBy = campo;
    this.sortDir = 1;
  }

  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

  private mesKey(): string {
    const y = this.dataAtual.getFullYear();
    const m = this.dataAtual.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  private mesKeyFromDate(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  private formatMonthLabel(monthKey: string): string {
    const [y, m] = monthKey.split('-').map((v) => Number(v));
    if (!y || !m) return monthKey;
    return formatMonthYearLabel(new Date(y, m - 1, 1));
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
