import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../core/utils/api-error.utils';
import { ApiDataService, IncomeSummaryState, StoredIncome } from '../../core/data/api-data.service';
import { ReceitasListaComponent } from './receitas-lista.component';
import { ReceitasFormComponent } from '../shared/receitas-form/receitas-form.component';
import { ReceitaFormModalComponent } from '../shared/receita-form-modal/receita-form-modal.component';
import { maskDateDDMMYYYY, maskMoneyInput } from '../../core/utils/input-mask';
import { AuthService } from '../../core/auth.service';
import { CategoriesService, CategoryDto } from '../../core/categories.service';
import { hasAtLeastRole, UserRole } from '../../core/roles';
import { colorForCategory } from '../../core/utils/category-color';
import { TxMobileHeaderComponent, TxMobileKpi } from '../../shared/transactions/tx-mobile-header.component';
import { TxFilterChipsComponent, TxFilterChip } from '../../shared/transactions/tx-filter-chips.component';
import { TxMobileListComponent, TxMobileItem } from '../../shared/transactions/tx-mobile-list.component';
import { DisplayInstallmentStatus, resolveInstallmentStatus, incomeStatusLabel, installmentStatusIcon, installmentStatusTone } from '../../core/utils/status';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { AccountsService, AccountResponse } from '../../core/accounts.service';
import { InstallmentsService } from '../../core/installments.service';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { TransactionSummaryCardComponent } from '../../shared/transactions/transaction-summary-card.component';
import { ComparisonPillComponent } from '../../shared/comparison-pill/comparison-pill.component';
import { PeriodTotalCardComponent } from '../../shared/period-total-card/period-total-card.component';
import { PeriodHeroComponent } from '../../shared/period-hero/period-hero.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { ConfirmSheetComponent } from '../../shared/confirm-sheet/confirm-sheet.component';
import { ConfirmDeleteComponent } from '../../shared/confirm-delete/confirm-delete.component';
import {
  HistoricoParcelaView,
  LancamentoHistoricoComponent
} from '../../shared/lancamento-historico/lancamento-historico.component';
import { HistoryEvent } from '../../shared/lancamento-historico/lancamento-historico.model';
import { PlansService, PlanHistoryInstallmentDto } from '../../core/plans.service';
import { toInstallmentStatus } from '../../core/types/money-types';
import { DeleteKind, DeleteScope } from '../../shared/confirm-delete/confirm-delete.model';
import { BulkActionBarComponent, BulkAction } from '../../shared/transactions/bulk-action-bar.component';
import { collate as collateText, compareLocaleDate, monthKeyFromDate, monthLabelFromKey } from '../../shared/transactions/transaction-helpers';
import {
  formatCurrencyValue,
  formatLocaleDate,
  formatMonthYearLabel,
  formatNumberValue,
  monthKeyFromLocaleDate,
  parseLocaleDate,
  parseLocalizedNumber
} from '../../core/utils/locale-utils';
import { SelectMenuComponent } from '../../shared/select-menu/select-menu.component';
import { AppCurrencyPipe } from '../../shared/app-currency.pipe';

@Component({
  selector: 'app-receitas',
  standalone: true,
  imports: [DecimalPipe, ReceitasListaComponent, ReceitasFormComponent, ReceitaFormModalComponent, NgClass, FormsModule, TooltipComponent, TransactionSummaryCardComponent, ComparisonPillComponent, PeriodTotalCardComponent, PeriodHeroComponent, FilterBarComponent, ConfirmSheetComponent, ConfirmDeleteComponent, LancamentoHistoricoComponent, BulkActionBarComponent, AppCurrencyPipe,
    SelectMenuComponent, TxMobileHeaderComponent, TxFilterChipsComponent, TxMobileListComponent],
  templateUrl: './receitas.component.html',
  styleUrls: ['./receitas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceitasComponent implements OnInit {
  dataAtual = new Date();
  // Estado assíncrono por signal (A9): rendasAll/summary/loadingMes vêm dos observables
  // do ApiDataService (HTTP fora da zona); os demais signals vêm de subscribes assíncronos.
  // Campos ngModel e sync-only ficam plain (refletem via o CD do signal co-setado).
  readonly rendasAll = signal<StoredIncome[]>([]);
  readonly summary = signal<IncomeSummaryState | null>(null);
  mostrarForm = false;
  novaRenda: StoredIncome = this.criaRenda();
  valorInput = '';
  recebimentoInput = '';
  erroData = '';
  erroCategoria = '';
  editandoId: string | null = null;
  editInstallmentId: string | null = null;
  editIsRecurring = false;
  editOriginalFonte = '';
  editOriginalCategoryId: string | null = null;
  confirmEdicao: Record<string, never> | null = null;
  readonly valorSugestao = signal<number | null>(null);
  saving = false;
  private alertaTimeout?: ReturnType<typeof setTimeout>;
  showDeleteModal = false;
  deletePlanId: string | null = null;
  deleteInstallmentId: string | null = null;
  deleteFonte = '';
  deleteValor = '';
  deleteKind: DeleteKind = 'single';
  showEditReceivedModal = false;
  editReceivedId: string | null = null;
  editReceivedSource = '';
  selectedIds = new Set<string>();
  readonly attachingReceiptIds = signal<Set<string>>(new Set());
  historicoAberto = false;
  historicoTitulo = '';
  historicoCarregando = false;
  historicoErro = '';
  historicoEventos: HistoryEvent[] = [];
  historicoParcelas: HistoricoParcelaView[] = [];
  historicoTemSerie = false;
  historicoParcelaAtualId: string | null = null;
  private receiptUploadTargetId: string | null = null;
  readonly loadingRecebido = signal(false);
  readonly loadingMes = signal(true);
  readonly contas = signal<AccountResponse[]>([]);
  contaBaixaId: string | null = null;
  private contasCarregadas = false;
  private carregandoContas = false;
  filtroTexto = '';
  filtroTipo: 'all' | 'recurring' | 'oneTime' = 'all';
  filtroStatus: 'ALL' | DisplayInstallmentStatus = 'ALL';
  filtroCategoria = 'ALL';

  /** Opções dos filtros. Rótulos iguais aos que já existiam nos selects. */
  readonly tipoOptions = [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'recurring', label: 'Recorrente' },
    { value: 'oneTime', label: 'Avulsa' }
  ];

  private readonly statusValues: DisplayInstallmentStatus[] = [
    'OPEN',
    'PARTIALLY_PAID',
    'PAID',
    'ANTICIPATED',
    'OVERDUE',
    'CANCELED'
  ];

  private readonly statusColors: Record<string, string> = {
    OPEN: 'var(--text-muted)',
    PARTIALLY_PAID: 'var(--warning)',
    PAID: 'var(--income)',
    ANTICIPATED: 'var(--primary)',
    OVERDUE: 'var(--expense)',
    CANCELED: 'var(--text-faint)'
  };

  /* Contagem por status, como nas despesas: ignora o filtro de status e
     respeita categoria e busca. */
  get statusOptions() {
    const base = this.rendasMes.filter((r) => this.filtroTextoMatch(r) && this.filtroCategoriaMatch(r));
    const contar = (valor: DisplayInstallmentStatus) =>
      base.filter((r) => resolveInstallmentStatus(r.status, r.recebimento) === valor).length;

    return [
      { value: 'ALL', label: 'Todos os status', color: 'var(--text-muted)', meta: String(base.length) },
      ...this.statusValues.map((valor) => ({
        value: valor,
        label: incomeStatusLabel(valor),
        color: this.statusColors[valor],
        meta: String(contar(valor))
      }))
    ];
  }

  /* ---- Mobile: mesmo dado da tabela, na forma que o celular pede ------- */

  get mobileKpis(): TxMobileKpi[] {
    const resumo = this.statusResumo;
    return [
      { label: 'Recebidas', value: formatCurrencyValue(resumo.pagosValor), tone: 'income' },
      { label: 'Pendentes', value: formatCurrencyValue(resumo.pendentesValor), tone: 'neutral' },
      { label: 'Lançamentos', value: String(this.rendasMes.length), tone: 'neutral' }
    ];
  }

  get statusChips(): TxFilterChip[] {
    return this.statusOptions.map((o) => ({
      value: o.value,
      label: o.value === 'ALL' ? 'Todos' : o.label,
      meta: o.meta
    }));
  }

  get mobileItems(): TxMobileItem[] {
    return this.rendas.map((r) => {
      const status = resolveInstallmentStatus(r.status, r.recebimento);
      return {
        id: r.id!,
        titulo: r.fonte || 'Receita',
        subtitulo: r.fixa ? `Recorrente · todo dia ${(r.recebimento || '').slice(0, 2)}` : '',
        valor: `+ ${formatCurrencyValue(r.valor || 0)}`,
        tom: 'income' as const,
        statusLabel: incomeStatusLabel(status),
        statusTone: installmentStatusTone(status),
        statusIcon: installmentStatusIcon(status),
        data: (r.recebimento || '').slice(0, 5) || '—',
        meta: r.categoria || 'Sem categoria'
      };
    });
  }

  get filtrosAtivos(): boolean {
    return this.filtroStatus !== 'ALL' || this.filtroCategoria !== 'ALL' || !!this.filtroTexto;
  }

  limparFiltros(): void {
    this.filtroStatus = 'ALL';
    this.filtroCategoria = 'ALL';
    this.filtroTexto = '';
    this.focusMode = 'none';
  }
  focusMode: 'none' | 'pending' = 'none';
  sortBy: 'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status' | null = null;
  sortDir: 1 | -1 = 1;
  readonly categorias = signal<CategoryDto[]>([]);
  get categoriaOptions() {
    const base = this.rendasMes.filter((r) => this.filtroTextoMatch(r) && this.filtroStatusMatch(r));
    const contar = (id: string) => base.filter((r) => r.categoryId === id).length;

    return [
      { value: 'ALL', label: 'Todas as categorias', color: 'var(--text-muted)', meta: String(base.length) },
      ...this.categorias().map((c) => ({
        value: c.id,
        label: c.name,
        color: colorForCategory(c.id || c.name),
        meta: String(contar(c.id))
      }))
    ];
  }

  constructor(
    private db: ApiDataService,
    private authService: AuthService,
    private categoriesService: CategoriesService,
    private uiFeedback: UiFeedbackService,
    private accountsService: AccountsService,
    private installments: InstallmentsService,
    private route: ActivatedRoute,
    private readonly location: Location,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly plansService: PlansService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const focus = (params.get('focus') || '').toLowerCase();
      if (focus === 'pending') {
        this.focusMode = 'pending';
        this.filtroStatus = 'OPEN';
      } else {
        this.focusMode = 'none';
      }
      // Busca global pode navegar com ?q= para pré-filtrar por texto.
      const q = params.get('q');
      if (q) this.filtroTexto = q;
      // O botão "+" da barra inferior do mobile chega por aqui.
      if (params.get('novo') === '1') {
        this.abrirModal();
        this.limparParametro('novo');
      }
      this.cdr.markForCheck();
    });

    this.loadingMes.set(true);
    this.db.refreshIncomes(this.mesKey());
    this.loadCategorias();
    this.db.incomes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.rendasAll.set([...lista]);
      this.valorSugestao.set(this.getUltimoValorParaFonte(this.novaRenda.fonte));
      this.cdr.markForCheck();
    });
    this.db.incomeSummary$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((summary) => {
      this.summary.set(summary);
      this.cdr.markForCheck();
    });
    this.db.incomesLoading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => {
      this.loadingMes.set(loading);
      this.cdr.markForCheck();
    });
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

  get bulkActions(): BulkAction[] {
    return [
      {
        label: 'Marcar como recebida',
        loadingLabel: 'Processando...',
        loading: this.loadingRecebido(),
        tone: 'primary',
        run: () => this.marcarRecebidasSelecionadas()
      }
    ];
  }

  get rendas(): StoredIncome[] {
    const key = this.mesKey();
    const filtradas = this.rendasAll()
      .filter((r) => this.mesKeyFromRecebimento(r.recebimento) === key)
      .filter((r) => this.filtroTextoMatch(r))
      .filter((r) => this.filtroTipoMatch(r))
      .filter((r) => this.filtroCategoriaMatch(r))
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
    const filtradas = this.rendasAll().filter((r) => this.mesKeyFromRecebimento(r.recebimento) === key);
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
    const s = this.summary();
    if (s) return s.total;
    return this.rendasMes.reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  get totalRecorrentes(): number {
    const s = this.summary();
    if (s) return s.totalRecurring;
    return this.rendasMes.filter((r) => r.fixa).reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  get totalAvulsas(): number {
    const s = this.summary();
    if (s) return s.totalOneTime;
    return this.rendasMes.filter((r) => !r.fixa).reduce((sum, r) => sum + (r.valor || 0), 0);
  }

  get statusResumo(): { pagos: number; pendentes: number; pagosValor: number; pendentesValor: number } {
    let pagos = 0;
    let pendentes = 0;
    let pagosValor = 0;
    let pendentesValor = 0;

    for (const renda of this.rendasMes) {
      // Por código, não por rótulo: comparar com o texto "Recebido" fazia o
      // resumo zerar assim que a palavra mudasse.
      if (renda.status === 'PAID') {
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
    const summary = this.summary();
    const summaryPrev = summary?.previousMonth;
    const prevTotal = summaryPrev ? summaryPrev.total : 0;
    const currentTotal = summary ? summary.total : this.totalRendas;
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

  /* Tira o parâmetro sem navegar: com NoReuseStrategy + onSameUrlNavigation
     'reload', qualquer navigate() recria a tela e fecharia o modal recém-aberto. */
  private limparParametro(nome: string): void {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete(nome);
    this.location.replaceState(url.pathname + url.search);
  }

  /* Atalho do combo de categoria: fecha o lançamento e leva para o cadastro —
     sem isto o "Criar nova categoria" não fazia nada. */
  irParaCategorias(): void {
    this.fecharModal();
    this.router.navigateByUrl('/categorias');
  }

  /**
   * Criar passou a ser do `app-receita-form-modal`, que carrega o próprio motor
   * e é o mesmo usado pelo Calendário — a regra de criação vive num lugar só.
   * `mostrarForm` (o painel antigo) ficou sendo exclusivo da EDIÇÃO, que arrasta
   * escopo de recorrência, comprovante e histórico e continua sendo desta tela.
   */
  mostrarNovo = false;

  abrirModal(): void {
    if (this.saving) return;
    this.mostrarNovo = true;
  }

  fecharNovo(): void {
    this.mostrarNovo = false;
    this.cdr.markForCheck();
  }

  fecharModal(): void {
    if (this.saving) return;
    this.mostrarForm = false;
    this.resetarForm();
  }

  salvar(): void {
    if (this.saving) return;
    const valor = this.parseValor(this.valorInput);
    if (!this.novaRenda.fonte) {
      this.setAlerta('Informe a fonte da receita.', 3000, 'error');
      return;
    }
    if (!valor) {
      this.setAlerta('Informe um valor maior que zero.', 3000, 'error');
      return;
    }

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

    // Edição de receita recorrente: perguntar o escopo (somente este mês ou toda a
    // recorrência) antes de persistir. Fecha o modal do formulário (z alto) para que a
    // confirm-sheet de escopo (z menor, renderizada em portal) fique visível por cima.
    if (this.editandoId && this.editIsRecurring) {
      this.mostrarForm = false;
      this.confirmEdicao = {};
      return;
    }

    this.persistirReceita('all', valor);
  }

  /** Abre o modal de escopo já resolvido: aplica a edição na parcela ou na recorrência. */
  confirmarEdicaoReceita(escopo: 'single' | 'all'): void {
    if (this.saving) return;
    const valor = this.parseValor(this.valorInput);
    if (!this.novaRenda.fonte || !valor) return;
    this.confirmEdicao = null;
    this.persistirReceita(escopo, valor);
  }

  cancelarEdicaoReceita(): void {
    this.confirmEdicao = null;
    // Reabre o formulário para o usuário não perder a edição em andamento.
    this.mostrarForm = true;
  }

  /**
   * Persiste a receita. `escopo='single'` edita apenas a parcela do mês (valor/data),
   * preservando os demais meses; `escopo='all'` cria/edita o plano inteiro.
   */
  private persistirReceita(escopo: 'single' | 'all', valor: number): void {
    const recebimentoNormalizado = this.recebimentoInput
      ? this.normalizaData(this.recebimentoInput)
      : formatLocaleDate(this.dataAtual);

    let save$: Observable<void>;
    if (this.editandoId && escopo === 'single' && this.editInstallmentId) {
      const fonteMudou = this.editOriginalFonte !== this.novaRenda.fonte;
      const categoriaMudou = (this.editOriginalCategoryId ?? null) !== (this.novaRenda.categoryId ?? null);
      if (fonteMudou || categoriaMudou) {
        this.setAlerta('Neste mês, apenas o valor e a data de recebimento são alterados. Fonte e categoria mudam ao editar toda a recorrência.', 4500, 'info');
      }
      save$ = this.db.updateIncomeInstallment(this.editInstallmentId, {
        valor,
        recebimento: recebimentoNormalizado
      });
    } else if (this.editandoId) {
      save$ = this.db.updateIncome(this.editandoId, {
        planId: this.editandoId,
        fonte: this.novaRenda.fonte,
        categoryId: this.novaRenda.categoryId ?? null,
        valor,
        recebimento: recebimentoNormalizado,
        fixa: this.novaRenda.fixa
      });
    } else {
      save$ = this.db.addIncome({
        planId: '',
        fonte: this.novaRenda.fonte,
        categoryId: this.novaRenda.categoryId ?? null,
        valor,
        recebimento: recebimentoNormalizado,
        fixa: this.novaRenda.fixa
      });
    }

    this.saving = true;
    save$
      .pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // saving vira false ANTES de fechar (finalize roda depois do next; fecharModal()
          // sai cedo se saving ainda for true). Mesmo padrão do cartoes.component.
          this.saving = false;
          this.setAlerta('Receita salva com sucesso.', 2500, 'success');
          this.fecharModal();
        },
        error: (err) => this.setAlerta(extractApiErrorMessage(err, 'Não foi possível salvar a receita.'), 4000, 'error')
      });
  }

  editar(renda: StoredIncome): void {
    this.editandoId = renda.planId ?? null;
    this.editInstallmentId = renda.id ?? null;
    this.editIsRecurring = renda.schedule === 'Recurring' || !!renda.fixa;
    this.editOriginalFonte = renda.fonte;
    this.editOriginalCategoryId = renda.categoryId ?? null;
    this.novaRenda = { ...renda };
    this.valorInput = formatNumberValue(renda.valor);
    this.recebimentoInput = renda.recebimento;
    this.valorSugestao.set(this.getUltimoValorParaFonte(renda.fonte));
    this.mostrarForm = true;
  }

  remover(payload: { planId?: string; installmentId: string }): void {
    const renda = this.rendasAll().find((r) => r.id === payload.installmentId);
    if (!renda) return;

    this.deletePlanId = payload.planId || null;
    this.deleteInstallmentId = payload.installmentId;
    this.deleteFonte = renda.fonte;
    this.deleteValor = formatCurrencyValue(renda.valor || 0);
    this.deleteKind = renda.schedule === 'Recurring' ? 'recurring' : 'single';
    this.showDeleteModal = true;
  }

  editarPorId(id: string): void {
    const renda = this.rendasAll().find((r) => r.id === id);
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

  confirmarExclusao(escopo: DeleteScope): void {
    if (escopo === 'all') {
      if (!this.deletePlanId) return;
      this.executarRemocaoReceita(this.db.removeIncome(this.deletePlanId));
      this.fecharModalExcluir();
      return;
    }

    if (!this.deleteInstallmentId) return;
    this.executarRemocaoReceita(this.db.removeIncomeInstallment(this.deleteInstallmentId));
    this.fecharModalExcluir();
  }

  /** Executa uma remoção de receita e dá feedback de sucesso/erro. */
  private executarRemocaoReceita(op$: Observable<void>): void {
    op$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.setAlerta('Receita excluída.', 2500, 'success'),
        error: (err) => this.setAlerta(extractApiErrorMessage(err, 'Não foi possível excluir a receita.'), 4000, 'error')
      });
  }

  fecharModalExcluir(): void {
    this.showDeleteModal = false;
    this.deletePlanId = null;
    this.deleteInstallmentId = null;
    this.deleteFonte = '';
    this.deleteValor = '';
    this.deleteKind = 'single';
  }

  confirmarEdicaoRecebida(): void {
    if (!this.editReceivedId) return;
    const renda = this.rendasAll().find((r) => r.id === this.editReceivedId);
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
    this.loadingRecebido.set(true);
    forkJoin(pedidos)
      .pipe(finalize(() => this.loadingRecebido.set(false)))
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
    this.valorSugestao.set(this.getUltimoValorParaFonte(fonte));
  }

  aplicarSugestao(): void {
    const sugestao = this.valorSugestao();
    if (!sugestao) return;
    this.valorInput = formatNumberValue(sugestao);
  }

  private resetarForm(): void {
    this.novaRenda = this.criaRenda();
    this.valorInput = '';
    this.recebimentoInput = '';
    this.editandoId = null;
    this.editInstallmentId = null;
    this.editIsRecurring = false;
    this.editOriginalFonte = '';
    this.editOriginalCategoryId = null;
    this.confirmEdicao = null;
    this.erroData = '';
    this.erroCategoria = '';
    this.valorSugestao.set(null);
  }

  /**
   * Gaveta de histórico: eventos do lançamento e, quando é série, as parcelas.
   * A série vem do servidor porque a tela só carrega o mês aberto.
   */
  abrirHistorico(id: string): void {
    const renda = this.rendasAll().find((r) => r.id === id);
    if (!renda) return;

    this.historicoTitulo = renda.fonte || 'Receita';
    this.historicoParcelaAtualId = renda.id ?? null;
    this.historicoAberto = true;
    this.historicoErro = '';
    this.historicoEventos = [];
    this.historicoParcelas = [];
    this.historicoTemSerie = false;

    const planId = renda.planId || null;
    if (!planId) {
      this.historicoErro = 'Esta receita não tem histórico disponível.';
      return;
    }

    this.historicoCarregando = true;
    this.plansService
      .history(planId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resposta) => {
          this.historicoCarregando = false;
          this.historicoEventos = resposta.events || [];
          const parcelas = resposta.installments || [];
          this.historicoTemSerie = resposta.schedule !== 'Recurring' && parcelas.length > 1;
          this.historicoParcelas = parcelas.map((parcela) => this.toParcelaView(parcela, parcelas.length));
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.historicoCarregando = false;
          this.historicoErro = extractApiErrorMessage(err, 'Não foi possível carregar o histórico.');
          this.cdr.markForCheck();
        }
      });
  }

  private toParcelaView(parcela: PlanHistoryInstallmentDto, total: number): HistoricoParcelaView {
    const status = toInstallmentStatus(parcela.status) || 'OPEN';
    const vencimento = formatLocaleDate(new Date(`${parcela.dueDate}T00:00:00`));

    return {
      id: parcela.id,
      numero: parcela.installmentNo,
      total,
      vencimento,
      valorLabel: `+ ${formatCurrencyValue(parcela.amount || 0)}`,
      status,
      statusLabel: incomeStatusLabel(resolveInstallmentStatus(status, vencimento)),
      podeAgir: status === 'PAID' || status === 'PARTIALLY_PAID',
      estornando: false,
      anexando: this.attachingReceiptIds().has(parcela.id)
    };
  }

  fecharHistorico(): void {
    this.historicoAberto = false;
    this.historicoTitulo = '';
    this.historicoEventos = [];
    this.historicoParcelas = [];
    this.historicoErro = '';
    this.historicoParcelaAtualId = null;
  }

  prepararAnexoComprovante(installmentId: string): void {
    if (!installmentId || this.attachingReceiptIds().has(installmentId)) return;
    this.receiptUploadTargetId = installmentId;
  }

  private addAttaching(id: string): void {
    this.attachingReceiptIds.set(new Set(this.attachingReceiptIds()).add(id));
  }

  private removeAttaching(id: string): void {
    const next = new Set(this.attachingReceiptIds());
    next.delete(id);
    this.attachingReceiptIds.set(next);
  }

  onComprovanteFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const installmentId = this.receiptUploadTargetId;
    input.value = '';
    this.receiptUploadTargetId = null;
    if (!file || !installmentId) return;

    this.addAttaching(installmentId);
    this.installments.listPayments(installmentId).subscribe({
      next: (payments) => {
        const target = [...(payments || [])]
          .filter((p) => p.paidAmount > 0)
          .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];

        if (!target) {
          this.removeAttaching(installmentId);
          this.setAlerta('Nenhum recebimento encontrado para anexar o comprovante.', 3000, 'info');
          return;
        }

        this.installments
          .uploadReceipt(installmentId, target.id, file)
          .pipe(finalize(() => this.removeAttaching(installmentId)))
          .subscribe({
            next: () => this.setAlerta('Comprovante anexado com sucesso.', 3000, 'success'),
            error: () => this.setAlerta('Falha ao anexar comprovante.', 3000, 'error')
          });
      },
      error: () => {
        this.removeAttaching(installmentId);
        this.setAlerta('Falha ao consultar recebimentos da parcela.', 3000, 'error');
      }
    });
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
          this.categorias.set(filtradas);
          return;
        }
        this.categoriesService.list().subscribe({
          next: (all) => {
            this.categorias.set(filtraReceitas(all || []));
          },
          error: () => {
            this.categorias.set([]);
          }
        });
      },
      error: () => {
        this.categorias.set([]);
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
    return compareLocaleDate(a, b);
  }

  private collate(a?: string | null, b?: string | null): number {
    return collateText(a, b);
  }

  private parseData(value: string): Date | null {
    return parseLocaleDate(value);
  }

  private getUltimoValorParaFonte(fonte: string): number | null {
    if (!fonte) return null;
    const needle = fonte.trim().toLowerCase();
    const candidatas = this.rendasAll().filter((r) => (r.fonte || '').trim().toLowerCase() === needle);
    if (!candidatas.length) return null;
    const ordenadas = [...candidatas].sort((a, b) => this.compareDateDesc(a.recebimento, b.recebimento));
    return ordenadas[0].valor;
  }

  private ensureContasCarregadas(): void {
    if (!this.canChooseAccount || this.contasCarregadas || this.carregandoContas) return;
    this.carregandoContas = true;
    this.accountsService.list().subscribe({
      next: (items) => {
        const contas = (items || []).filter((c) => c.isActive);
        this.contas.set(contas);
        this.contaBaixaId = this.accountsService.resolveDefaultAccountId(contas);
        this.contasCarregadas = true;
        this.carregandoContas = false;
      },
      error: () => {
        this.contas.set([]);
        this.contaBaixaId = null;
        this.accountsService.setDefaultAccountId(null);
        this.carregandoContas = false;
      }
    });
  }

  mesAnterior(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
    this.loadingMes.set(true);
    this.db.refreshIncomes(this.mesKey());
  }

  proximoMes(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() + 1, 1);
    this.loadingMes.set(true);
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
    return monthKeyFromDate(this.dataAtual);
  }

  private mesKeyFromDate(date: Date): string {
    return monthKeyFromDate(date);
  }

  private formatMonthLabel(monthKey: string): string {
    return monthLabelFromKey(monthKey);
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

  private filtroCategoriaMatch(renda: StoredIncome): boolean {
    return this.filtroCategoria === 'ALL' ? true : renda.categoryId === this.filtroCategoria;
  }

  private filtroTipoMatch(renda: StoredIncome): boolean {
    if (this.filtroTipo === 'all') return true;
    if (this.filtroTipo === 'recurring') return !!renda.fixa;
    return !renda.fixa;
  }

  /* Compara código com código: antes comparava o RÓTULO ("Recebido"), então
     qualquer ajuste de texto quebrava o filtro sem ninguém perceber. */
  private filtroStatusMatch(renda: StoredIncome): boolean {
    if (this.filtroStatus === 'ALL') return true;
    return resolveInstallmentStatus(renda.status, renda.recebimento) === this.filtroStatus;
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
