import { computed, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { extractApiErrorMessage } from '../../core/utils/api-error.utils';
import { cardLabel } from '../../core/utils/card-label';
import { ApiDataService, StoredExpense, StoredCard } from '../../core/data/api-data.service';
import { DespesasListaComponent } from './despesas-lista.component';
import { DespesasFormComponent } from '../shared/despesas-form/despesas-form.component';
import { CartaoFormComponent } from '../shared/cartao-form/cartao-form.component';
import { InstallmentsService } from '../../core/installments.service';
import { InstallmentStatus, toInstallmentStatus } from '../../core/types/money-types';
import { CategoriesService, CategoryDto } from '../../core/categories.service';
import { AccountsService, AccountResponse } from '../../core/accounts.service';
import { AuthService } from '../../core/auth.service';
import { hasAtLeastRole, UserRole } from '../../core/roles';
import { planLabelForRole } from '../../core/plan-labels';
import { PaymentMethodLookup, LookupsService } from '../../core/lookups.service';
import { CardDto } from '../../core/cards.service';
import { toStoredCard } from '../../core/data/card.mapper';
import { maskDateDDMMYYYY, maskMoneyInput } from '../../core/utils/input-mask';
import { colorForCategory } from '../../core/utils/category-color';
import { TxMobileHeaderComponent, TxMobileKpi } from '../../shared/transactions/tx-mobile-header.component';
import { TxFilterChipsComponent, TxFilterChip } from '../../shared/transactions/tx-filter-chips.component';
import { TxMobileListComponent, TxMobileItem } from '../../shared/transactions/tx-mobile-list.component';
import { DisplayInstallmentStatus, resolveInstallmentStatus, expenseStatusLabel, installmentStatusIcon, installmentStatusTone, InstallmentStatusTone } from '../../core/utils/status';
import { UiFeedbackService } from '../../core/ui-feedback.service';
import { UiPermissionsService } from '../../core/ui-permissions.service';
import { InvoiceImportComponent } from '../shared/invoice-import/invoice-import.component';
import { TooltipComponent } from '../../shared/tooltip/tooltip.component';
import { TransactionSummaryCardComponent } from '../../shared/transactions/transaction-summary-card.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { ComparisonPillComponent } from '../../shared/comparison-pill/comparison-pill.component';
import { PeriodTotalCardComponent } from '../../shared/period-total-card/period-total-card.component';
import { PeriodHeroComponent } from '../../shared/period-hero/period-hero.component';
import { FilterBarComponent } from '../../shared/filter-bar/filter-bar.component';
import { ConfirmSheetComponent } from '../../shared/confirm-sheet/confirm-sheet.component';
import { PlansService, PlanHistoryInstallmentDto } from '../../core/plans.service';
import { ConfirmDeleteComponent } from '../../shared/confirm-delete/confirm-delete.component';
import {
  HistoricoParcelaView,
  LancamentoHistoricoComponent
} from '../../shared/lancamento-historico/lancamento-historico.component';
import { HistoryEvent } from '../../shared/lancamento-historico/lancamento-historico.model';
import { DeleteKind, DeleteScope } from '../../shared/confirm-delete/confirm-delete.model';
import { BodyPortalDirective } from '../../shared/body-portal.directive';
import { BulkActionBarComponent, BulkAction } from '../../shared/transactions/bulk-action-bar.component';
import { collate as collateText, compareLocaleDate, monthKeyFromDate, monthLabelFromKey } from '../../shared/transactions/transaction-helpers';
import {
  expenseMonthKeys,
  statementNoticeMessage,
  statementNoticeMonth
} from '../../shared/transactions/card-expense-notice';
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
  selector: 'app-despesas',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    DespesasListaComponent,
    DespesasFormComponent,
    CartaoFormComponent,
    InvoiceImportComponent,
    TooltipComponent,
    TransactionSummaryCardComponent,
    FilterBarComponent,
    ConfirmSheetComponent,
    ConfirmDeleteComponent,
    LancamentoHistoricoComponent,
    BulkActionBarComponent,
    ComparisonPillComponent,
    PeriodTotalCardComponent,
    PeriodHeroComponent,
    SelectMenuComponent,
    AppCurrencyPipe, TxMobileHeaderComponent, TxFilterChipsComponent, TxMobileListComponent
],
  templateUrl: './despesas.component.html',
  styleUrls: ['./despesas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DespesasComponent implements OnInit {
  dataAtual = new Date();
  // Estado assíncrono por signal (A9): despesasPorMes/categorias/cartoes/contas/cardBrandMap
  // vêm de observables/HTTP fora da zona. Campos ngModel e sync-only ficam plain (refletem
  // via o CD do signal co-setado no mesmo callback).
  readonly categorias = signal<CategoryDto[]>([]);
  private categoriaMap = new Map<string, string>();
  private expensesCache: StoredExpense[] = [];
  readonly cartoes = signal<StoredCard[]>([]);
  readonly cardBrandMap = signal<Record<string, string>>({});
  readonly contas = signal<AccountResponse[]>([]);
  contaBaixaId: string | null = null;
  readonly despesasPorMes = signal<Record<string, StoredExpense[]>>({});
  sortBy: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | 'status' | null = null;
  sortDir: 1 | -1 = 1;
  mostrarForm = false;
  mostrarCartaoForm = false;
  saving = false;
  valorInput = '';
  vencimentoInput = '';
  erroData = '';
  erroCategoria = '';
  formaPagamento: 'avista' | 'cartao' = 'avista';
  /* Id da forma escolhida no catálogo (Pix, Boleto, Débito…). O 'avista'/'cartao'
     continua existindo porque é ele que decide se há cartão e parcelamento. */
  formaPagamentoId: number | null = null;
  parcelar = false;
  parcelasCount = 1;
  fixa = false;
  fixaMeses: number | null = null;
  cartaoSelecionadoId: string | null = null;
  editando: { id: string; planId?: string; isParcela: boolean; isRecorrente: boolean; originalNome: string; originalCategoryId: string | null } | null = null;
  confirmEdicao: { isRecorrente: boolean } | null = null;
  /**
   * Lançamento de cartão recém-criado, esperando os dados voltarem para dizer
   * em que fatura ele caiu. Guardado por nome + cartão porque o `addExpense`
   * devolve `void` — não há id para seguir.
   */
  private avisoDeCompetenciaPendente: { nome: string; cartaoId: string | null } | null = null;

  confirmRemocao: {
    id: string;
    serieId?: string;
    totalParcelas?: number;
    kind: DeleteKind;
    nome: string;
    valor: string;
  } | null = null;
  private alertaTimeout?: ReturnType<typeof setTimeout>;
  selectedIds = new Set<string>();
  filtroStatus: ('ALL' | InstallmentStatus) = 'ALL';

  /** Opções do dropdown de status. Rótulos vêm de `expenseStatusLabel`. */
  /* Ordem do design: do que ainda vai acontecer para o que já saiu do caminho.
     "Atrasada" é derivada (OPEN vencida) — ver resolveInstallmentStatus. */
  private readonly statusValues: DisplayInstallmentStatus[] = [
    'OPEN',
    'PARTIALLY_PAID',
    'PAID',
    'ANTICIPATED',
    'OVERDUE',
    'CANCELED'
  ];

  /** Cor do ponto de cada status no menu — mesma escala das etiquetas. */
  private readonly statusColors: Record<string, string> = {
    OPEN: 'var(--text-muted)',
    PARTIALLY_PAID: 'var(--warning)',
    PAID: 'var(--income)',
    ANTICIPATED: 'var(--primary)',
    OVERDUE: 'var(--expense)',
    CANCELED: 'var(--text-faint)'
  };

  /* Contagem por status ao lado de cada opção: mostra onde há o que olhar
     antes de a pessoa filtrar e descobrir que não há nada. As contagens
     ignoram o filtro de status (senão o escolhido zeraria os outros) mas
     respeitam categoria e busca. */
  get statusOptions() {
    const base = this.despesas.filter((d) => this.categoriaMatch(d) && this.nomeMatch(d));
    const contar = (valor: DisplayInstallmentStatus) =>
      base.filter((d) => resolveInstallmentStatus(d.status, d.vencimento) === valor).length;

    return [
      { value: 'ALL', label: 'Todos os status', color: 'var(--text-muted)', meta: String(base.length) },
      ...this.statusValues.map((valor) => ({
        value: valor,
        label: expenseStatusLabel(valor),
        color: this.statusColors[valor],
        meta: String(contar(valor))
      }))
    ];
  }

  /* ---- Mobile: mesmo dado da tabela, na forma que o celular pede ------- */

  get mobileKpis(): TxMobileKpi[] {
    return [
      { label: 'Pendentes', value: formatCurrencyValue(this.totalPendentes), tone: 'expense' },
      { label: 'Antecipadas', value: formatCurrencyValue(this.totalAntecipadas), tone: 'neutral' },
      { label: 'Pagas', value: formatCurrencyValue(this.totalPagas), tone: 'income' }
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
    return this.despesasFiltradas.map((d) => {
      const status = resolveInstallmentStatus(d.status, d.vencimento);
      return {
        id: d.id!,
        titulo: d.nome || 'Despesa',
        subtitulo: this.subtituloDespesa(d),
        valor: formatCurrencyValue(d.valor || 0),
        tom: 'expense' as const,
        statusLabel: expenseStatusLabel(status),
        statusTone: installmentStatusTone(status),
        statusIcon: installmentStatusIcon(status),
        data: (d.vencimento || '').slice(0, 5) || '—',
        meta: this.pagamentoLabel(d)
      };
    });
  }

  private subtituloDespesa(d: StoredExpense): string {
    if (d.fixa) {
      const dia = (d.vencimento || '').slice(0, 2);
      return dia ? `Recorrente · todo dia ${dia}` : 'Recorrente';
    }
    if (d.parcelasTotal && d.parcelasTotal > 1) return `Parcelamento em ${d.parcelasTotal}x`;
    return '';
  }

  get filtrosAtivos(): boolean {
    return this.filtroStatus !== 'ALL' || this.filtroCategoria !== 'ALL' || !!this.filtroNome;
  }

  limparFiltros(): void {
    this.filtroStatus = 'ALL';
    this.filtroCategoria = 'ALL';
    this.filtroNome = '';
  }

  /**
   * Categorias como opções do dropdown.
   *
   * Sem ponto colorido: `CategoryDto` não carrega cor — ela é derivada por
   * índice em `CATEGORY_PALETTE` na tela de Categorias. Trazer a cor para cá
   * exigiria repetir essa derivação e as duas divergiriam.
   */
  /* Categorias com contagem e ponto colorido — a cor vem de colorForCategory,
     a mesma usada na tela de categorias e no combo do lançamento. */
  get categoriaOptions() {
    const base = this.despesas.filter((d) => this.statusMatch(d) && this.nomeMatch(d));
    const contar = (id: string) => base.filter((d) => d.categoryId === id).length;

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

  private statusMatch(d: StoredExpense): boolean {
    return this.filtroStatus === 'ALL'
      ? true
      : resolveInstallmentStatus(d.status, d.vencimento) === this.filtroStatus;
  }
  filtroCategoria: string = 'ALL';
  filtroNome: string = '';
  readonly loadingPagar = signal(false);
  readonly loadingAntecipar = signal(false);
  historicoAberto = false;
  historicoTitulo = '';
  historicoCarregando = false;
  historicoErro = '';
  historicoEventos: HistoryEvent[] = [];
  historicoParcelas: HistoricoParcelaView[] = [];
  /** Recorrente não lista ocorrências: a gaveta mostra só a linha do tempo. */
  historicoTemSerie = false;
  historicoParcelaAtualId: string | null = null;
  private historicoPlanId: string | null = null;
  historicoItens: StoredExpense[] = [];
  readonly reversingIds = signal<Set<string>>(new Set());
  readonly attachingReceiptIds = signal<Set<string>>(new Set());
  private receiptUploadTargetId: string | null = null;
  mostrarImportFatura = false;

  novaDespesa: StoredExpense = this.criaDespesa();

  constructor(
    private db: ApiDataService,
    private installments: InstallmentsService,
    private categoriesService: CategoriesService,
    private accountsService: AccountsService,
    private lookupsService: LookupsService,
    private authService: AuthService,
    private uiFeedback: UiFeedbackService,
    private uiPermissions: UiPermissionsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly router: Router,
    private readonly plansService: PlansService
  ) {}

  get currentRole(): UserRole | null {
    return this.authService.getRole();
  }

  get canImportInvoices(): boolean {
    return this.uiPermissions.canImportInvoices();
  }

  get canChooseAccount(): boolean {
    return hasAtLeastRole(this.currentRole, 'Intermediate');
  }

  get canAnticipateExpenses(): boolean {
    return hasAtLeastRole(this.currentRole, 'Intermediate');
  }

  ngOnInit(): void {
    // Busca global pode navegar com ?q= para pré-filtrar a lista por nome.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const q = params.get('q');
      if (q) {
        this.filtroNome = q;
        this.cdr.markForCheck();
      }
      // O botão "+" da barra inferior do mobile chega por aqui.
      if (params.get('novo') === '1') {
        this.abrirModal();
        this.limparParametro('novo');
        this.cdr.markForCheck();
      }
    });

    this.db.expenses$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.expensesCache = lista;
      this.rebuildDespesas();
      this.resolverAvisoDeCompetencia();
      this.cdr.markForCheck();
    });

    this.categoriesService.list('Expense').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        const filtradas = (data || []).filter((item) => {
          const applies = (item.appliesTo || '').toString().toLowerCase();
          return applies === 'expense' || applies === 'despesa' || applies === 'despesas';
        });
        this.categorias.set(filtradas);
        this.categoriaMap = new Map(filtradas.map((c) => [c.id, c.name]));
        const resolvedId = this.resolveCategoriaId(this.novaDespesa);
        if (resolvedId) {
          const resolvedName = this.categoriaMap.get(resolvedId) || this.novaDespesa.categoria;
          this.novaDespesa = { ...this.novaDespesa, categoryId: resolvedId, categoria: resolvedName };
        }
        this.rebuildDespesas();
        this.cdr.markForCheck();
      },
      error: () => {
        this.categorias.set([]);
        this.categoriaMap = new Map();
        this.rebuildDespesas();
        this.cdr.markForCheck();
      }
    });

    this.db.cards$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((cards) => {
      this.cartoes.set(cards);
      if (cards.length && !this.cartaoSelecionadoId) {
        this.cartaoSelecionadoId = cards[0].id;
      }
      if (!cards.length) {
        this.cartaoSelecionadoId = null;
      }
      this.cdr.markForCheck();
    });

    this.accountsService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        const contas = (items || []).filter((c) => c.isActive);
        this.contas.set(contas);
        this.contaBaixaId = this.accountsService.resolveDefaultAccountId(contas);
        this.cdr.markForCheck();
      },
      error: () => {
        this.contas.set([]);
        this.contaBaixaId = null;
        this.accountsService.setDefaultAccountId(null);
        this.cdr.markForCheck();
      }
    });

    this.lookupsService.paymentMethods().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (methods) => {
        this.paymentMethods.set(methods || []);
        this.cdr.markForCheck();
      },
      error: () => {
        this.paymentMethods.set([]);
        this.cdr.markForCheck();
      }
    });

    this.lookupsService.cardBrands().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (brands) => {
        const nextMap: Record<string, string> = {};
        for (const brand of brands || []) {
          const idKey = String(brand.id);
          const readable = (brand.name || brand.code || '').trim();
          if (readable) nextMap[idKey] = readable;
        }
        this.cardBrandMap.set(nextMap);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cardBrandMap.set({});
        this.cdr.markForCheck();
      }
    });
  }

  get mesAtualLabel(): string {
    return formatMonthYearLabel(this.dataAtual);
  }

  get mesAtual(): string {
    return this.mesAtualLabel;
  }

  get previousComparison(): {
    month: string;
    delta: number;
    deltaAbs: number;
    percent: number;
    trend: 'up' | 'down' | 'flat';
    isNew: boolean;
  } | null {
    const prevKey = this.previousMonthKey();
    const prevTotal = this.totalMesByKey(prevKey);
    const currentTotal = this.totalMes();
    if (prevTotal === 0 && currentTotal === 0) return null;
    const delta = currentTotal - prevTotal;
    const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const isNew = prevTotal === 0 && currentTotal > 0;
    const percent = prevTotal === 0 ? (currentTotal ? 100 : 0) : (delta / prevTotal) * 100;
    return {
      month: this.formatMonthLabel(prevKey),
      delta,
      deltaAbs: Math.abs(delta),
      percent,
      trend,
      isNew
    };
  }

  get despesas(): StoredExpense[] {
    return this.despesasPorMes()[this.mesKey()] || [];
  }

  get totalPendentes(): number {
    return this.somaPorStatus(['OPEN', 'PARTIALLY_PAID']);
  }

  get totalAntecipadas(): number {
    return this.somaPorStatus(['ANTICIPATED']);
  }

  get totalPagas(): number {
    return this.somaPorStatus(['PAID']);
  }

  get selecionados(): string[] {
    const visiveisSelecionaveis = new Set(
      this.despesasFiltradas
        .filter((d) => d.status !== 'PAID' && d.status !== 'CANCELED')
        .map((d) => d.id)
        .filter((id): id is string => !!id)
    );
    return Array.from(this.selectedIds).filter((id) => visiveisSelecionaveis.has(id));
  }

  get selecionadosPagaveis(): StoredExpense[] {
    const selecionados = new Set(this.selecionados);
    return this.despesas.filter((d) => selecionados.has(d.id) && d.status !== 'PAID' && d.status !== 'CANCELED');
  }

  get bulkActions(): BulkAction[] {
    const actions: BulkAction[] = [
      {
        label: 'Marcar como pago',
        loadingLabel: 'Processando...',
        loading: this.loadingPagar(),
        tone: 'primary',
        run: () => this.pagarSelecionadas()
      }
    ];
    /* Duas condições distintas, tratadas de formas distintas:

       MÊS — antecipar só faz sentido para parcela de mês futuro. Se nada na
       seleção é elegível, a ação não aparece: oferecer um botão que só sabe
       recusar é pior que não oferecer.

       PLANO — aqui a ação aparece mesmo sem acesso, porque o recurso EXISTE
       para aquela seleção; só não está liberado. Quem clica descobre qual
       plano libera, em `anteciparSelecionadas()`. Escondê-la aqui deixaria o
       usuário sem saber que o recurso existe. */
    if (this.selecionadosAntecipaveis.length) {
      actions.push({
        label: 'Solicitar antecipação',
        loadingLabel: 'Antecipando...',
        loading: this.loadingAntecipar(),
        tone: 'ghost',
        run: () => this.anteciparSelecionadas()
      });
    }
    actions.push({ label: 'Excluir', tone: 'danger', run: () => this.excluirSelecionadas() });
    return actions;
  }

  get selecionadosAntecipaveis(): StoredExpense[] {
    // Regra: pode antecipar apenas se o vencimento for em mês futuro em relação à data de hoje
    const hoje = new Date();
    const mesHoje = hoje.getMonth();
    const anoHoje = hoje.getFullYear();
    const selecionados = new Set(this.selecionados);
    return this.despesas.filter((d) => {
      if (!selecionados.has(d.id)) return false;
      if (d.status === 'PAID' || d.status === 'CANCELED' || d.status === 'ANTICIPATED') return false;
      const data = this.parseData(d.vencimento || '');
      if (!data) return false;
      // Vencimento precisa ser depois do mês atual (hoje) para ser elegível
      return data.getFullYear() > anoHoje || (data.getFullYear() === anoHoje && data.getMonth() > mesHoje);
    });
  }

  /* Valor de CADA parcela, não o total: com 1000 em 12x o campo mostra 83,33.
     Antes devolvia o valor cheio, então o resumo dizia "12x de R$ 1.000,00". */
  get valorParcelaLabel(): string {
    const valor = this.parseValor(this.valorInput);
    if (!valor) return this.valorInput;

    const parcelas = this.parcelar && this.parcelasCount > 1 ? this.parcelasCount : 1;
    return formatNumberValue(valor / parcelas);
  }

  private categoriaMatch(d: StoredExpense): boolean {
    return this.filtroCategoria === 'ALL' ? true : d.categoryId === this.filtroCategoria;
  }

  private nomeMatch(d: StoredExpense): boolean {
    return this.filtroNome ? (d.nome || '').toLowerCase().includes(this.filtroNome.toLowerCase()) : true;
  }

  get despesasFiltradas(): StoredExpense[] {
    const base = this.despesas.filter((d) => {
      return this.statusMatch(d) && this.categoriaMatch(d) && this.nomeMatch(d);
    });
    if (!this.sortBy) return base;
    const compare = (a: StoredExpense, b: StoredExpense) => {
      switch (this.sortBy) {
        case 'nome':
          return this.collate(a.nome, b.nome);
        case 'categoria':
          return this.collate(a.categoria, b.categoria);
        case 'pagamento':
          return this.collate(this.pagamentoLabel(a), this.pagamentoLabel(b));
        case 'vencimento':
          return this.compareDate(a.vencimento, b.vencimento);
        case 'valor':
          return (a.valor || 0) - (b.valor || 0);
        case 'status':
          return this.collate(this.statusLabel(a.status), this.statusLabel(b.status));
        default:
          return 0;
      }
    };
    return base.sort((a, b) => compare(a, b) * this.sortDir);
  }

  get cartaoSelecionadoLabel(): string {
    const card = this.cartoes().find((c) => c.id === this.cartaoSelecionadoId);
    if (!card) return 'Nenhum cartão selecionado';
    return this.formatarCartaoLabel(card);
  }

  cardLabel(id?: string): string {
    if (!id) return '';
    const card = this.cartoes().find((c) => c.id === id);
    if (card) return this.formatarCartaoLabel(card);
    return id;
  }

  /**
   * Como foi pago: nome da forma escolhida no cadastro (Pix, Boleto, Débito…).
   * No crédito o cartão diz mais que a forma, então mostramos o cartão — e a
   * fatura, quando o lançamento já está atrelado a uma.
   */
  readonly paymentMethods = signal<PaymentMethodLookup[]>([]);

  paymentMethodLabel(id?: number | null): string {
    if (!id) return '';
    return this.paymentMethods().find((m) => m.id === id)?.name || '';
  }

  pagamentoLabel(d: StoredExpense): string {
    if (!d.cartao) return this.paymentMethodLabel(d.paymentMethodId) || 'À vista';
    const card = this.cardLabel(d.cartao);
    if (d.statementReference) {
      return `${card} · Fatura ${d.statementReference}`;
    }
    const month = d.statementMonth ? String(d.statementMonth).padStart(2, '0') : null;
    const year = d.statementYear ?? null;
    if (month && year) {
      return `${card} · Fatura ${month}/${year}`;
    }
    return card;
  }

  editarDespesaPorId(id: string): void {
    const lista = this.despesasPorMes()[this.mesKey()] || [];
    const index = lista.findIndex((d) => d.id === id);
    if (index >= 0) {
      this.editarDespesa(this.mesKey(), index);
    }
  }

  openRemocaoPorId(id: string): void {
    const lista = this.despesasPorMes()[this.mesKey()] || [];
    const item = lista.find((d) => d.id === id);
    if (!item) return;
    const index = lista.indexOf(item);
    this.openRemocao(item, this.mesKey(), index);
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
      const ids = this.despesasFiltradas
        .filter((d) => d.status !== 'PAID' && d.status !== 'CANCELED')
        .map((d) => d.id)
        .filter((id): id is string => !!id);
      this.selectedIds = new Set(ids);
    } else {
      this.selectedIds.clear();
    }
  }

  /**
   * Abre a gaveta e busca a série inteira no servidor.
   *
   * A tela só tem em memória as parcelas dos meses carregados — a 12ª de um
   * parcelado pode vencer no ano seguinte. Sem buscar, a lista sairia capenga e
   * o "6 de 12 parcelas pagas" mentiria.
   */
  abrirHistorico(id: string): void {
    const todas = Object.values(this.despesasPorMes()).flat();
    const alvo = todas.find((d) => d.id === id);
    if (!alvo) return;

    const planId = alvo.planId || alvo.serieId || null;

    // Só o nome: a posição da parcela já aparece na lista, com destaque na atual.
    this.historicoTitulo = alvo.nome || 'Lançamento';
    this.historicoParcelaAtualId = alvo.id ?? null;
    this.historicoAberto = true;
    this.historicoErro = '';
    this.historicoEventos = [];
    this.historicoParcelas = [];
    this.historicoTemSerie = false;
    this.historicoPlanId = planId;

    if (!planId) {
      this.historicoErro = 'Este lançamento não tem histórico disponível.';
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
          // Ocorrência de recorrente não é parcela: uma lista de 60 meses no
          // lugar de "12x" confundiria mais do que ajudaria.
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
    const exibido = resolveInstallmentStatus(status, formatLocaleDate(new Date(`${parcela.dueDate}T00:00:00`)));

    return {
      id: parcela.id,
      numero: parcela.installmentNo,
      total,
      vencimento: formatLocaleDate(new Date(`${parcela.dueDate}T00:00:00`)),
      valorLabel: formatCurrencyValue(parcela.amount || 0),
      status,
      statusLabel: expenseStatusLabel(exibido),
      podeAgir: status === 'PAID' || status === 'PARTIALLY_PAID',
      estornando: this.isReversing(parcela.id),
      anexando: this.isAttachingReceipt(parcela.id)
    };
  }

  /**
   * Recebe o id da parcela vindo da gaveta e reusa o fluxo já existente.
   *
   * A gaveta lista a série inteira, que veio do servidor — inclusive parcelas de
   * meses que a tela não carregou e que, por isso, não estão em `expensesCache`.
   * Nesse caso o alvo é montado a partir do que a própria gaveta mostra.
   */
  estornarPorId(installmentId: string): void {
    const alvo = this.expensesCache.find((d) => d.id === installmentId) ?? this.despesaDaGaveta(installmentId);
    if (!alvo) {
      // Falhar calado aqui já custou uma sessão de depuração: a gaveta some do
      // caminho e a pessoa fica sem saber se clicou.
      this.setAlerta('Não foi possível localizar a parcela para estornar.', 3000, 'error');
      return;
    }
    this.estornarDespesa(alvo);
  }

  prepararAnexoPorId(installmentId: string): void {
    const alvo = this.expensesCache.find((d) => d.id === installmentId) ?? this.despesaDaGaveta(installmentId);
    if (alvo) this.prepararAnexoComprovante(alvo);
  }

  private despesaDaGaveta(installmentId: string): StoredExpense | null {
    const parcela = this.historicoParcelas.find((p) => p.id === installmentId);
    if (!parcela) return null;

    return {
      id: parcela.id,
      nome: this.historicoTitulo,
      categoria: '',
      valor: 0,
      vencimento: parcela.vencimento,
      status: parcela.status as InstallmentStatus
    } as StoredExpense;
  }

  get historicoPagas(): StoredExpense[] {
    return this.historicoItens.filter((h) => h.status === 'PAID' || h.status === 'PARTIALLY_PAID');
  }

  get historicoPendentes(): StoredExpense[] {
    return this.historicoItens.filter((h) => h.status !== 'PAID' && h.status !== 'PARTIALLY_PAID');
  }

  fecharHistorico(): void {
    this.historicoAberto = false;
    this.historicoItens = [];
    this.historicoTitulo = '';
    this.historicoEventos = [];
    this.historicoParcelas = [];
    this.historicoErro = '';
    this.historicoPlanId = null;
    this.historicoParcelaAtualId = null;
    this.reversingIds.set(new Set());
  }

  isReversing(installmentId: string): boolean {
    return this.reversingIds().has(installmentId);
  }

  private addReversing(id: string): void {
    this.reversingIds.set(new Set(this.reversingIds()).add(id));
  }

  private removeReversing(id: string): void {
    const next = new Set(this.reversingIds());
    next.delete(id);
    this.reversingIds.set(next);
  }

  private addAttaching(id: string): void {
    this.attachingReceiptIds.set(new Set(this.attachingReceiptIds()).add(id));
  }

  private removeAttaching(id: string): void {
    const next = new Set(this.attachingReceiptIds());
    next.delete(id);
    this.attachingReceiptIds.set(next);
  }

  estornarDespesa(h: StoredExpense): void {
    if (!h?.id || this.isReversing(h.id)) return;
    if (h.status !== 'PAID' && h.status !== 'PARTIALLY_PAID') {
      this.setAlerta('Somente parcelas pagas podem ser estornadas.', 2500, 'info');
      return;
    }

    this.addReversing(h.id);
    this.installments.listPayments(h.id).subscribe({
      next: (payments) => {
        const target = [...(payments || [])]
          .filter((p) => p.canReverse && p.paidAmount > 0)
          .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];

        if (!target) {
          this.removeReversing(h.id);
          this.setAlerta('Nenhum pagamento elegível para estorno nesta parcela.', 3000, 'info');
          return;
        }

        this.installments
          .reversePayment(h.id, target.id, {
            reversedAt: new Date().toISOString(),
            note: 'Estorno solicitado pela UI de despesas'
          })
          .pipe(finalize(() => this.removeReversing(h.id)))
          .subscribe({
            next: () => {
              this.db.refresh(true);
              this.setAlerta('Pagamento estornado com sucesso.', 3000, 'success');
            },
            error: () => {
              this.setAlerta('Falha ao estornar pagamento.', 3000, 'error');
            }
          });
      },
      error: () => {
        this.removeReversing(h.id);
        this.setAlerta('Falha ao consultar pagamentos da parcela.', 3000, 'error');
      }
    });
  }

  isAttachingReceipt(installmentId: string): boolean {
    return this.attachingReceiptIds().has(installmentId);
  }

  prepararAnexoComprovante(h: StoredExpense): void {
    if (!h?.id || this.isAttachingReceipt(h.id)) return;
    if (h.status !== 'PAID' && h.status !== 'PARTIALLY_PAID') {
      this.setAlerta('Só é possível anexar comprovante a uma despesa já paga.', 2500, 'info');
      return;
    }
    this.receiptUploadTargetId = h.id;
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
          this.setAlerta('Nenhum pagamento encontrado para anexar o comprovante.', 3000, 'info');
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
        this.setAlerta('Falha ao consultar pagamentos da parcela.', 3000, 'error');
      }
    });
  }

  pagarDespesaPorId(id: string): void {
    if (this.canChooseAccount && !this.contaBaixaId) {
      this.setAlerta('Selecione uma conta ativa para registrar o pagamento.', 3000, 'error');
      return;
    }
    const lista = this.despesasPorMes()[this.mesKey()] || [];
    const item = lista.find((d) => d.id === id);
    if (!item) return;
    const payload = {
      paidAmount: item.valor,
      paidAt: new Date().toISOString(),
      methodId: null,
      note: null,
      accountId: this.canChooseAccount ? this.contaBaixaId : null
    };
    this.loadingPagar.set(true);
    if (this.canChooseAccount) {
      this.accountsService.setDefaultAccountId(this.contaBaixaId);
    }
    this.installments
      .pay(id, payload)
      .pipe(finalize(() => this.loadingPagar.set(false)))
      .subscribe({
      next: () => {
        this.atualizarStatusLocal([id], 'PAID');
        this.db.refresh(true);
        this.setAlerta('Despesa marcada como paga.', 3000, 'success');
      },
      error: () => {
        this.setAlerta('Falha ao marcar como paga.', 3000, 'error');
      }
    });
  }

  pagarSelecionadas(): void {
    const pagaveis = this.selecionadosPagaveis;
    if (!pagaveis.length) {
      this.setAlerta('Nenhuma despesa selecionada para pagar.', 2000);
      return;
    }
    if (this.canChooseAccount && !this.contaBaixaId) {
      this.setAlerta('Selecione uma conta ativa para registrar os pagamentos.', 3000, 'error');
      return;
    }

    const pedidos = pagaveis.map((item) =>
      this.installments.pay(item.id, {
        paidAmount: item.valor,
        paidAt: new Date().toISOString(),
        methodId: null,
        note: null,
        accountId: this.canChooseAccount ? this.contaBaixaId : null
      })
    );

    this.loadingPagar.set(true);
    if (this.canChooseAccount) {
      this.accountsService.setDefaultAccountId(this.contaBaixaId);
    }
    forkJoin(pedidos)
      .pipe(finalize(() => this.loadingPagar.set(false)))
      .subscribe({
      next: () => {
        this.atualizarStatusLocal(pagaveis.map((p) => p.id), 'PAID');
        this.selectedIds.clear();
        this.db.refresh(true);
        this.setAlerta('Pagamentos registrados com sucesso.', 3000, 'success');
      },
      error: () => {
        this.setAlerta('Falha ao marcar pagamentos.', 3000, 'error');
      }
    });
  }

  excluirSelecionadas(): void {
    const ids = Array.from(this.selectedIds);
    if (!ids.length) return;

    if (ids.length === 1) {
      this.openRemocaoPorId(ids[0]);
      return;
    }

    const selectedItems = ids
      .map((id) => this.despesas.find((d) => d.id === id))
      .filter((d): d is StoredExpense => !!d);

    const hasSeriesOrRecurring = selectedItems.some((d) => !!d.fixa || !!d.parcelasTotal || !!d.serieId || !!d.planId);
    if (hasSeriesOrRecurring) {
      this.setAlerta(
        'Para despesas recorrentes/parceladas, exclua uma por vez para escolher entre somente esta ou toda a série.',
        3500,
        'info'
      );
      return;
    }

    this.selectedIds.clear();
    if (!ids.length) return;
    forkJoin(ids.map((id) => this.db.removeExpense(id)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.setAlerta('Despesas excluídas.', 2500, 'success'),
        error: (err) => this.setAlerta(extractApiErrorMessage(err, 'Não foi possível excluir uma ou mais despesas.'), 4000, 'error')
      });
  }

  /** Executa uma remoção de despesa e dá feedback de sucesso/erro. */
  private executarRemocaoDespesa(op$: Observable<void>): void {
    op$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.setAlerta('Despesa excluída.', 2500, 'success'),
        error: (err) => this.setAlerta(extractApiErrorMessage(err, 'Não foi possível excluir a despesa.'), 4000, 'error')
      });
  }

  anteciparSelecionadas(): void {
    if (!this.canAnticipateExpenses) {
      // O nome comercial sai de `planLabelForRole`, e não escrito à mão: se o
      // plano for renomeado na landing, este aviso acompanha.
      this.setAlerta(
        `Antecipação de despesas está disponível a partir do ${planLabelForRole('Intermediate')}.`,
        4000,
        'info'
      );
      return;
    }

    const selecionadas = this.selecionados;
    if (!selecionadas.length) {
      this.setAlerta('Selecione ao menos uma despesa para antecipar.', 2000);
      return;
    }

    const doMesAtual = (this.despesas || []).filter((d) => this.selectedIds.has(d.id) && this.isMesAtual(d.vencimento));
    if (doMesAtual.length) {
      this.setAlerta('Não é possível antecipar despesas do mês atual.', 2500);
      return;
    }

    const antecipaveis = this.selecionadosAntecipaveis;
    if (!antecipaveis.length) {
      this.setAlerta('Nenhuma despesa selecionada pode ser antecipada.', 2000);
      return;
    }

    const novaDataIso = this.hojeIso();
    const pedidos = antecipaveis.map((item) =>
      this.installments.anticipate(item.id, { dueDate: novaDataIso })
    );

    this.loadingAntecipar.set(true);
    forkJoin(pedidos)
      .pipe(finalize(() => this.loadingAntecipar.set(false)))
      .subscribe({
      next: () => {
        this.moverParaMesAtual(antecipaveis.map((a) => a.id), novaDataIso, 'ANTICIPATED');
        this.selectedIds.clear();
        this.db.refresh(true);
        this.setAlerta('Antecipação registrada.', 2500, 'success');
      },
      error: () => {
        this.setAlerta('Falha ao antecipar despesas.', 3000, 'error');
      }
    });
  }

  private atualizarStatusLocal(ids: string[], status: StoredExpense['status']): void {
    const key = this.mesKey();
    const lista = this.despesasPorMes()[key] || [];
    const atualizada = lista.map((d) => (ids.includes(d.id) ? { ...d, status } : d));
    this.despesasPorMes.set({ ...this.despesasPorMes(), [key]: atualizada });
  }

  private moverParaMesAtual(ids: string[], novaDataIso: string, status: StoredExpense['status']): void {
    const targetDate = new Date(novaDataIso);
    const targetKey = this.mesKeyFromDate(targetDate);
    const novaData = formatLocaleDate(targetDate);

    const novoMapa: Record<string, StoredExpense[]> = {};
    Object.entries(this.despesasPorMes()).forEach(([key, lista]) => {
      const filtrada = lista.filter((d) => !ids.includes(d.id));
      novoMapa[key] = filtrada;
    });

    const atuais = novoMapa[targetKey] || [];
    const itensAtualizados = ids
      .map((id) => {
        const encontrado = Object.values(this.despesasPorMes()).flat().find((d) => d.id === id);
        if (!encontrado) return null;
        return {
          ...encontrado,
          vencimento: novaData,
          status
        };
      })
      .filter(Boolean) as StoredExpense[];

    novoMapa[targetKey] = [...atuais, ...itensAtualizados];
    this.despesasPorMes.set(novoMapa);
  }

  private hojeIso(): string {
    const hoje = new Date();
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    return d.toISOString().slice(0, 10);
  }

  adicionar(): void {
    if (this.saving) return;
    const valor = this.parseValor(this.valorInput);
    if (!this.novaDespesa.nome) {
      this.setAlerta('Informe o nome da despesa.', 3000, 'error');
      return;
    }
    if (!valor) {
      this.setAlerta('Informe um valor maior que zero.', 3000, 'error');
      return;
    }

    if (!this.novaDespesa.categoryId) {
      this.erroCategoria = 'Selecione uma categoria.';
      return;
    }
    this.erroCategoria = '';

    if (!this.isDataValida(this.vencimentoInput)) {
      this.erroData = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }
    this.erroData = '';

    const vencimentoNormalizado = this.normalizaData(this.vencimentoInput);
    const dataBase = this.parseData(vencimentoNormalizado);
    if (!dataBase) {
      this.erroData = 'Data inválida. Use o formato DD/MM/AAAA.';
      return;
    }

    const serieId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    if (this.editando) {
      if (this.editando.isParcela || this.editando.isRecorrente) {
        // Fecha o modal do formulário (z alto) para a confirm-sheet de escopo
        // (z menor, em portal) ficar visível por cima. Mesmo fix das receitas.
        this.mostrarForm = false;
        this.confirmEdicao = { isRecorrente: this.editando.isRecorrente };
        return;
      }
      this.aplicarEdicao('all', valor, vencimentoNormalizado);
      return;
    }

    // Clamp de sanidade: parcelas no cartão até 36 e duração fixa até 120 meses,
    // evitando geração em massa de parcelas (e erro do backend por exceder o teto).
    const parcelas = this.parcelar && this.parcelasCount > 1
      ? Math.min(Math.max(Math.trunc(this.parcelasCount), 2), 36)
      : 1;
    const valorParcela = valor;
    const fixaMeses = this.fixa && this.fixaMeses
      ? Math.min(Math.max(Math.trunc(this.fixaMeses), 1), 120)
      : null;

    this.saving = true;
    // Guardados antes de fechar o modal, que limpa o formulário.
    const nomeCriado = this.novaDespesa.nome;
    const cartaoDoLancamento = this.formaPagamento === 'cartao' ? this.cartaoSelecionadoId ?? null : null;
    // Cria um único plano no backend; o back gera as parcelas conforme installmentsCount.
    this.db.addExpense({
      nome: this.novaDespesa.nome,
      categoria: this.resolveCategoriaNome(this.novaDespesa),
      categoryId: this.novaDespesa.categoryId ?? null,
      valor: Number(valorParcela.toFixed(2)),
      vencimento: formatLocaleDate(dataBase),
      cartao: this.formaPagamento === 'cartao' ? this.cartaoSelecionadoId ?? undefined : undefined,
      paymentMethodId: this.formaPagamentoId,
      parcelaNumero: parcelas > 1 ? 1 : undefined,
      parcelasTotal: parcelas > 1 ? parcelas : undefined,
      serieId: parcelas > 1 ? serieId : undefined,
      fixa: this.fixa,
      fixaMeses
    })
      .pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // saving vira false ANTES de fechar: o finalize (que zera saving) só roda depois
          // do next, e fecharModal() sai cedo se saving ainda for true — por isso o modal
          // não fechava. Ver cartoes.component (mesmo padrão correto).
          this.saving = false;
          this.setAlerta('Despesa salva com sucesso.', 2500, 'success');
          if (this.formaPagamento === 'cartao') {
            this.avisoDeCompetenciaPendente = { nome: nomeCriado, cartaoId: cartaoDoLancamento };
          }
          this.fecharModal();
        },
        error: (err) => this.setAlerta(extractApiErrorMessage(err, 'Não foi possível salvar a despesa.'), 4000, 'error')
      });
  }

  totalMes(): number {
    return this.despesas.reduce((sum, d) => sum + d.valor, 0);
  }

  proximoMes(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() + 1, 1);
  }

  mesAnterior(): void {
    this.dataAtual = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
  }

  onFormaPagamentoChange(value: 'avista' | 'cartao'): void {
    this.formaPagamento = value;

    if (value === 'cartao') {
      this.fixa = false;
      this.fixaMeses = null;
      this.parcelar = this.parcelasCount > 1 ? true : this.parcelar;
      if (!this.cartaoSelecionadoId && this.cartoes().length) {
        this.cartaoSelecionadoId = this.cartoes()[0].id;
      }
      return;
    }

    this.parcelar = false;
    this.parcelasCount = 1;
    this.cartaoSelecionadoId = null;
  }

  onValorChange(raw: string): void {
    this.valorInput = maskMoneyInput(raw);
  }

  onVencimentoChange(raw: string): void {
    this.vencimentoInput = maskDateDDMMYYYY(raw);
    this.erroData = !this.vencimentoInput || this.isDataValida(this.vencimentoInput)
      ? ''
      : 'Data inválida. Use o formato DD/MM/AAAA.';
  }

  onFixaToggle(value: boolean): void {
    this.fixa = value;
    if (!value) {
      this.fixaMeses = null;
    }
  }

  onFixaMesesChange(value: number | null): void {
    if (value === null || value === undefined || Number.isNaN(value)) {
      this.fixaMeses = null;
      return;
    }
    this.fixaMeses = value;
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

  abrirModal(): void {
    if (this.saving) return;
    this.resetarFormulario();
    this.mostrarForm = true;
  }

  /* Crédito sem cartão cadastrado: em vez de mandar a pessoa para /cartoes e
     perder o que ela já preencheu, escondemos o lançamento, abrimos o cadastro
     de cartão e voltamos ao mesmo rascunho — com o cartão novo selecionado. */
  abrirCadastroCartao(): void {
    if (this.saving) return;
    this.mostrarForm = false;
    this.mostrarCartaoForm = true;
  }

  fecharCadastroCartao(): void {
    this.mostrarCartaoForm = false;
    this.mostrarForm = true;
  }

  onCartaoCriado(card: CardDto): void {
    this.mostrarCartaoForm = false;
    /* Entra na lista na hora para o select já abrir com ele escolhido; o
       refresh confirma depois com o que o servidor tem. */
    this.cartoes.set([...this.cartoes(), toStoredCard(card)]);
    this.cartaoSelecionadoId = card.id;
    this.mostrarForm = true;
    this.db.refresh(true);
  }

  abrirImportFatura(): void {
    this.mostrarImportFatura = true;
  }

  fecharImportFatura(): void {
    this.mostrarImportFatura = false;
  }

  onImportFaturaConcluida(result: { created: number; skipped: number; failed: number }): void {
    this.db.refresh(true);
    if (result.failed > 0) {
      this.uiFeedback.warning(
        `Importação parcial: ${result.created} criado(s), ${result.skipped} ignorado(s), ${result.failed} com falha.`
      );
      return;
    }
    this.uiFeedback.success(
      `Importação concluída: ${result.created} lançamento(s) criado(s) e ${result.skipped} ignorado(s).`
    );
  }

  fecharModal(): void {
    if (this.saving) return;
    this.mostrarForm = false;
    this.erroData = '';
    this.erroCategoria = '';
    this.editando = null;
    this.confirmEdicao = null;
    this.fixa = false;
    this.fixaMeses = null;
    this.resetarFormulario();
  }

  editarDespesa(mesKey: string, index: number): void {
    const item = this.despesasPorMes()[mesKey]?.[index];
    if (!item) return;
    const categoriaId = this.resolveCategoriaId(item);
    const categoriaNome = this.resolveCategoriaNome({ categoryId: categoriaId, categoria: item.categoria });
    this.editando = {
      id: item.id!,
      planId: item.planId,
      isParcela: !!item.parcelasTotal,
      isRecorrente: !!item.fixa,
      originalNome: item.nome,
      originalCategoryId: categoriaId ?? null
    };
    this.novaDespesa = {
      nome: item.nome,
      categoria: categoriaNome,
      categoryId: categoriaId,
      valor: item.valor,
      vencimento: item.vencimento,
      id: item.id!,
      cartao: item.cartao,
      parcelaNumero: item.parcelaNumero,
      parcelasTotal: item.parcelasTotal,
      serieId: item.serieId
    };
    this.valorInput = formatNumberValue(item.valor);
    this.vencimentoInput = item.vencimento;
    this.formaPagamento = item.cartao ? 'cartao' : 'avista';
    this.cartaoSelecionadoId = item.cartao || this.cartoes()[0]?.id || null;
    this.parcelar = !!item.parcelasTotal;
    this.parcelasCount = item.parcelasTotal || 1;
    this.fixa = !!item.fixa;
    this.fixaMeses = item.fixaMeses ?? null;
    this.parcelar = !this.fixa && this.parcelasCount > 1;
    this.mostrarForm = true;
  }

  confirmarEdicao(escopo: 'single' | 'all'): void {
    if (!this.editando) return;
    const valor = this.parseValor(this.valorInput);
    const vencimentoNormalizado = this.normalizaData(this.vencimentoInput);
    this.confirmEdicao = null;
    this.aplicarEdicao(escopo, valor, vencimentoNormalizado);
  }

  cancelarEdicao(): void {
    this.confirmEdicao = null;
    // Reabre o formulário para o usuário não perder a edição em andamento.
    this.mostrarForm = true;
  }

  /**
   * Abre a confirmação — sempre, inclusive para lançamento avulso.
   *
   * O avulso era removido direto daqui, sem diálogo nenhum: um clique no ícone
   * de lixeira da tabela e a despesa sumia.
   *
   * Despesa de cartão também se exclui por aqui. Havia um bloqueio no front
   * ("altere a forma de pagamento ou exclua o cartão primeiro") que nenhuma
   * regra de negócio sustenta: `DELETE /installments/:id` e `DELETE /plans/:id`
   * aceitam a operação e já limpam pagamentos e lançamentos de conta. A pessoa
   * ficava sem conseguir apagar uma compra lançada errado no cartão.
   */
  openRemocao(d: StoredExpense, _mesKey: string, _index: number): void {
    this.confirmRemocao = {
      id: d.id!,
      serieId: d.planId || d.serieId,
      totalParcelas: d.parcelasTotal,
      kind: d.fixa ? 'recurring' : d.parcelasTotal && d.serieId ? 'series' : 'single',
      nome: d.nome || 'Despesa',
      valor: formatCurrencyValue(d.valor || 0)
    };
  }

  confirmarRemocao(escopo: DeleteScope): void {
    if (!this.confirmRemocao) return;
    const { id, serieId } = this.confirmRemocao;

    this.executarRemocaoDespesa(
      escopo === 'all' && serieId ? this.db.removeExpenseSeries(serieId) : this.db.removeExpense(id)
    );

    this.confirmRemocao = null;
  }

  cancelarRemocao(): void {
    this.confirmRemocao = null;
  }

  /**
   * Diz em que fatura a despesa de cartão caiu, quando não é o mês aberto.
   *
   * Sem isto o lançamento simplesmente sumia: a parcela entra na competência
   * da fatura, que depende do dia de fechamento do cartão, e a pessoa ficava
   * olhando para uma lista onde a despesa que acabou de criar não está.
   */
  private resolverAvisoDeCompetencia(): void {
    const pendente = this.avisoDeCompetenciaPendente;
    if (!pendente) return;

    const doLancamento = this.expensesCache.filter(
      (d) => d.nome === pendente.nome && (!pendente.cartaoId || d.cartao === pendente.cartaoId)
    );
    // Ainda não chegou no store: espera a próxima emissão.
    if (!doLancamento.length) return;

    this.avisoDeCompetenciaPendente = null;
    const mesDaFatura = statementNoticeMonth(this.mesKey(), expenseMonthKeys(doLancamento));
    if (mesDaFatura) {
      this.setAlerta(statementNoticeMessage(mesDaFatura), 6000, 'info');
    }
  }

  public mesKey(): string {
    return monthKeyFromDate(this.dataAtual);
  }

  tituloBandeira(b: string): string {
    return `Marca ${b}`;
  }

  formatarCartaoLabel(card: StoredCard): string {
    return cardLabel(card, this.cardBrandMap());
  }

  private mesKeyFromDate(date: Date): string {
    return monthKeyFromDate(date);
  }

  private previousMonthKey(): string {
    const prev = new Date(this.dataAtual.getFullYear(), this.dataAtual.getMonth() - 1, 1);
    return this.mesKeyFromDate(prev);
  }

  private totalMesByKey(key: string): number {
    const lista = this.despesasPorMes()[key] || [];
    return lista.reduce((sum, d) => sum + d.valor, 0);
  }

  private formatMonthLabel(value: string): string {
    return monthLabelFromKey(value);
  }

  private mesKeyFromVencimento(vencimento: string): string | null {
    return monthKeyFromLocaleDate(vencimento);
  }

  private parseData(value: string): Date | null {
    return parseLocaleDate(value);
  }

  private addMonthsClamped(date: Date, months: number): Date {
    const targetYear = date.getFullYear();
    const targetMonth = date.getMonth() + months;
    const baseDay = date.getDate();
    const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const day = Math.min(baseDay, lastDayOfTargetMonth);
    return new Date(targetYear, targetMonth, day);
  }

  private resetarFormulario(): void {
    this.novaDespesa = this.criaDespesa();
    this.valorInput = '';
    this.vencimentoInput = '';
    this.parcelar = false;
    this.parcelasCount = 1;
    this.formaPagamento = 'avista';
    this.editando = null;
    this.cartaoSelecionadoId = this.cartoes()[0]?.id || null;
  }

  ordenarPor(campo: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | 'status'): void {
    if (this.sortBy === campo) {
      this.sortDir = this.sortDir === 1 ? -1 : 1;
    } else {
      this.sortBy = campo;
      this.sortDir = 1;
    }
  }

  private normalizaData(value: string): string {
    return maskDateDDMMYYYY(value);
  }

  statusLabel(status?: InstallmentStatus): string {
    return expenseStatusLabel(status);
  }

  statusTone(status?: InstallmentStatus): InstallmentStatusTone {
    return installmentStatusTone(status);
  }

  public parseValor(value: string | number): number {
    return parseLocalizedNumber(value);
  }

  private somaPorStatus(statuses: string[]): number {
    return this.despesas
      .filter((d) => statuses.includes(d.status || 'OPEN'))
      .reduce((sum, d) => sum + (d.valor || 0), 0);
  }

  private setAlerta(msg: string, duracao = 3000, tipo: 'info' | 'success' | 'error' = 'info'): void {
    if (this.alertaTimeout) {
      clearTimeout(this.alertaTimeout);
    }
    if (tipo === 'success') this.uiFeedback.success(msg, duracao);
    if (tipo === 'error') this.uiFeedback.error(msg, duracao);
    if (tipo === 'info') this.uiFeedback.info(msg, duracao);
    this.alertaTimeout = setTimeout(() => {
      /* noop */
    }, duracao);
  }

  private isMesAtual(vencimento?: string): boolean {
    const data = this.parseData(vencimento || '');
    if (!data) return false;
    const hoje = new Date();
    return data.getFullYear() === hoje.getFullYear() && data.getMonth() === hoje.getMonth();
  }

  private collate(a: string | undefined, b: string | undefined): number {
    return collateText(a, b);
  }

  private compareDate(a: string | undefined, b: string | undefined): number {
    return compareLocaleDate(a, b);
  }

  private isDataValida(value: string): boolean {
    return !!parseLocaleDate(value);
  }

  private criaDespesa(): StoredExpense {
    return {
      id: '',
      nome: '',
      categoria: '',
      categoryId: null,
      valor: 0,
      vencimento: ''
    };
  }

  private resolveCategoriaNome(expense: Pick<StoredExpense, 'categoryId' | 'categoria'>): string {
    const byId = expense.categoryId ? this.categoriaMap.get(expense.categoryId) : null;
    if (byId) return byId;
    return expense.categoria || 'Outros';
  }

  private resolveCategoriaId(expense: Pick<StoredExpense, 'categoryId' | 'categoria'>): string | null {
    if (expense.categoryId) return expense.categoryId;
    const nome = (expense.categoria || '').trim().toLowerCase();
    if (!nome) return null;
    const match = this.categorias().find((c) => c.name.trim().toLowerCase() === nome);
    return match?.id ?? null;
  }

  private aplicarEdicao(
    escopo: 'single' | 'all',
    valor: number,
    vencimentoNormalizado: string
  ): void {
    if (!this.editando) return;
    if (escopo === 'all' && !this.editando.planId) {
      this.setAlerta('Não foi possível editar esta despesa. Recarregue a página e tente novamente.', 3000, 'error');
      return;
    }
    const payload = {
      planId: this.editando.planId,
      nome: this.novaDespesa.nome,
      categoria: this.resolveCategoriaNome(this.novaDespesa),
      categoryId: this.novaDespesa.categoryId ?? null,
      valor,
      vencimento: vencimentoNormalizado,
      cartao: this.formaPagamento === 'cartao' ? this.cartaoSelecionadoId ?? undefined : undefined
    };

    if (escopo === 'single') {
      const nomeMudou = this.editando.originalNome !== payload.nome;
      const categoriaMudou = (this.editando.originalCategoryId ?? null) !== (payload.categoryId ?? null);
      if (nomeMudou || categoriaMudou) {
        this.setAlerta('Nesta parcela, apenas valor e vencimento são alterados. Nome e categoria mudam ao editar toda a série.', 4500, 'info');
      }
    }

    this.saving = true;
    const update$ = escopo === 'single'
      ? this.db.updateExpenseInstallment(this.editando.id, payload)
      : this.db.updateExpense(this.editando.id, payload);
    update$
      .pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.setAlerta('Despesa atualizada com sucesso.', 2500, 'success');
          this.fecharModal();
        },
        error: (err) => this.setAlerta(extractApiErrorMessage(err, 'Não foi possível atualizar a despesa.'), 4000, 'error')
      });
  }

  private rebuildDespesas(): void {
    const lista = this.expensesCache.map((item) => ({
      ...item,
      categoria: this.resolveCategoriaNome(item)
    }));

    this.despesasPorMes.set(lista.reduce((acc, item) => {
      const isAntecipada = item.status === 'ANTICIPATED';
      const key = isAntecipada
        ? this.mesKeyFromDate(new Date()) || this.mesKey()
        : this.mesKeyFromVencimento(item.vencimento) || this.mesKey();
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {} as Record<string, StoredExpense[]>));
  }
  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

}
