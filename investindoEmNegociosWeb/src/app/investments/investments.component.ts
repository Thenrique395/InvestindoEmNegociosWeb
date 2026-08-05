import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  InvestmentsService,
  B3ExtractResponse,
  B3ImportStrategy,
  InvestmentPosition,
  InvestmentPositionRequest,
  InvestmentType,
  MovementType
} from '../investments.service';
import { LookupsService, InstitutionLookup } from '../lookups.service';
import { maskMoneyInput } from '../utils/input-mask';
import { formatNumberValue, parseLocalizedNumber } from '../utils/locale-utils';
import { SUPPORTED_CURRENCIES } from '../utils/locale-settings';
import { resolveApiErrorMessage } from '../utils/api-error.mapper';
import { UiFeedbackService } from '../ui-feedback.service';
import { firstValueFrom } from 'rxjs';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { SegmentedSelectorComponent, SegmentOption } from '../shared/segmented-selector/segmented-selector.component';
import { InvestmentAnalysisPanelComponent } from './components/investment-analysis-panel/investment-analysis-panel.component';
import { InvestmentAssetsListComponent, InvestmentPositionSortKey } from './components/investment-assets-list/investment-assets-list.component';
import {
  ConsolidationBucket,
  ConsolidationMovementRow,
  InvestmentConsolidationPanelComponent
} from './components/investment-consolidation-panel/investment-consolidation-panel.component';
import { InvestmentDividendsPanelComponent } from './components/investment-dividends-panel/investment-dividends-panel.component';
import { InvestmentImportModalComponent } from './components/investment-import-modal/investment-import-modal.component';
import {
  InvestmentLaunchModalsComponent,
  InvestmentLaunchOperation
} from './components/investment-launch-modals/investment-launch-modals.component';
import { InvestmentOverviewPanelComponent, PatrimonyBucket } from './components/investment-overview-panel/investment-overview-panel.component';
import {
  InvestmentProfitabilityPanelComponent,
  ProfitabilityPoint,
  ProfitabilityYearRow
} from './components/investment-profitability-panel/investment-profitability-panel.component';
import { buildInvestmentsOverview, InvestmentsOverview } from './investments-overview.model';
import {
  AllocationInvestmentType,
  BenchmarkKey,
  DEFAULT_TARGET_ALLOCATION,
  benchmarkMonthPercent,
  isAllocationType,
  isCurrentMonth,
  isProventoMovement,
  mapTargetAllocationResponse,
  normalize,
  parseCsvRows,
  positionCurrentValue,
  positionNetContributed
} from '../utils/investments.utils';

type FormMode = 'create' | 'movement';
type CadastroOperacao = InvestmentLaunchOperation;
type InvestmentsTab = 'RESUMO' | 'CONSOLIDACAO' | 'PROVENTOS' | 'RENTABILIDADE' | 'ANALISE';
type ChartBucket = { key: string; label: string; aporte: number; resgate: number; proventos: number; saldo: number };
type PatrimonioBucket = PatrimonyBucket;
type PositionSortKey = InvestmentPositionSortKey;
type ProventoMonthBucket = { key: string; label: string; total: number };
type ConsolidacaoBucket = ConsolidationBucket;
type ConsolidacaoMovimentoRow = ConsolidationMovementRow;
type RentabilidadeMonthPoint = ProfitabilityPoint;
@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, SegmentedSelectorComponent, InvestmentAnalysisPanelComponent, InvestmentAssetsListComponent, InvestmentConsolidationPanelComponent, InvestmentDividendsPanelComponent, InvestmentImportModalComponent, InvestmentLaunchModalsComponent, InvestmentOverviewPanelComponent, InvestmentProfitabilityPanelComponent],
  templateUrl: './investments.component.html',
  styleUrls: ['./investments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentsComponent implements OnInit {
  private readonly tabStorageKey = 'investments.activeTab';
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // A9: estado assíncrono via signal, exposto por getter/setter para manter as leituras
  // e escritas existentes intactas (o setter dirige o signal → re-render OnPush headless).
  private readonly _positions = signal<InvestmentPosition[]>([]);
  get positions(): InvestmentPosition[] { return this._positions(); }
  set positions(v: InvestmentPosition[]) { this._positions.set(v); }
  private readonly _institutions = signal<InstitutionLookup[]>([]);
  get institutions(): InstitutionLookup[] { return this._institutions(); }
  set institutions(v: InstitutionLookup[]) { this._institutions.set(v); }
  searchTerm = '';
  filterType: 'ALL' | InvestmentType = 'ALL';
  filterAccount = 'ALL';
  filterStatus: 'ALL' | 'ACTIVE' | 'ZEROED' = 'ALL';
  mode: FormMode = 'create';
  selectedId: string | null = null;
  private readonly _showCadastro = signal(false);
  get showCadastro(): boolean { return this._showCadastro(); }
  set showCadastro(v: boolean) { this._showCadastro.set(v); }
  private readonly _showMovimento = signal(false);
  get showMovimento(): boolean { return this._showMovimento(); }
  set showMovimento(v: boolean) { this._showMovimento.set(v); }
  private readonly _showB3Import = signal(false);
  get showB3Import(): boolean { return this._showB3Import(); }
  set showB3Import(v: boolean) { this._showB3Import.set(v); }
  posSelecionada?: InvestmentPosition | null;
  metaPatrimonioInput = '';
  private readonly _metaPatrimonio = signal(0);
  get metaPatrimonio(): number { return this._metaPatrimonio(); }
  set metaPatrimonio(v: number) { this._metaPatrimonio.set(v); }
  private readonly _metaSalvando = signal(false);
  get metaSalvando(): boolean { return this._metaSalvando(); }
  set metaSalvando(v: boolean) { this._metaSalvando.set(v); }
  private readonly _b3Loading = signal(false);
  get b3Loading(): boolean { return this._b3Loading(); }
  set b3Loading(v: boolean) { this._b3Loading.set(v); }
  private readonly _b3Importing = signal(false);
  get b3Importing(): boolean { return this._b3Importing(); }
  set b3Importing(v: boolean) { this._b3Importing.set(v); }
  private readonly _b3Error = signal('');
  get b3Error(): string { return this._b3Error(); }
  set b3Error(v: string) { this._b3Error.set(v); }
  private readonly _b3FileName = signal('');
  get b3FileName(): string { return this._b3FileName(); }
  set b3FileName(v: string) { this._b3FileName.set(v); }
  b3Strategy: B3ImportStrategy = 'merge';
  private readonly _b3Preview = signal<B3ExtractResponse | null>(null);
  get b3Preview(): B3ExtractResponse | null { return this._b3Preview(); }
  set b3Preview(v: B3ExtractResponse | null) { this._b3Preview.set(v); }
  sortBy: PositionSortKey = 'asset';
  sortDir: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 8;
  patrimonioRangeMonths = 12;
  patrimonioTypeFilter: 'ALL' | InvestmentType = 'ALL';
  carteiraTypeFilter: 'ALL' | InvestmentType = 'ALL';
  rentabilidadePeriodo: 'SINCE_START' | 'LAST_12M' = 'SINCE_START';
  rentabilidadeTipoFiltro: 'ALL' | InvestmentType = 'ALL';
  rentabilidadeBenchmark: BenchmarkKey = 'CDI';
  consolidacaoHorizonteAnos = 2;
  consolidacaoTipoFiltro: 'ALL' | InvestmentType = 'ALL';
  consolidacaoSearchTerm = '';
  private readonly _showAlocacaoConfig = signal(false);
  get showAlocacaoConfig(): boolean { return this._showAlocacaoConfig(); }
  set showAlocacaoConfig(v: boolean) { this._showAlocacaoConfig.set(v); }
  private allocationLoadWarned = false;
  private readonly _targetAllocation = signal<Record<AllocationInvestmentType, number>>({ ...DEFAULT_TARGET_ALLOCATION });
  get targetAllocation(): Record<AllocationInvestmentType, number> { return this._targetAllocation(); }
  set targetAllocation(v: Record<AllocationInvestmentType, number>) { this._targetAllocation.set(v); }
  cadastroOperacao: CadastroOperacao = 'COMPRA';
  activeTab: InvestmentsTab = 'RESUMO';
  tabs: Array<{ key: InvestmentsTab; label: string }> = [
    { key: 'RESUMO', label: 'Resumo' },
    { key: 'CONSOLIDACAO', label: 'Consolidação' },
    { key: 'PROVENTOS', label: 'Proventos' },
    { key: 'RENTABILIDADE', label: 'Rentabilidade' },
    { key: 'ANALISE', label: 'Análise' }
  ];
  benchmarkOptions: Array<{ key: BenchmarkKey; label: string; color: string }> = [
    { key: 'CDI', label: 'CDI', color: 'var(--color-chart-series-3)' },
    { key: 'IPCA', label: 'IPCA', color: 'var(--color-chart-series-2)' },
    { key: 'IFIX', label: 'IFIX', color: 'var(--color-warning-text)' },
    { key: 'IBOV', label: 'IBOV', color: 'var(--color-chart-expense)' },
    { key: 'SMLL', label: 'SMLL', color: 'var(--color-chart-series-5)' },
    { key: 'IDIV', label: 'IDIV', color: 'var(--color-chart-income)' },
    { key: 'IVVB11', label: 'IVVB11', color: 'var(--color-chart-series-4)' }
  ];

  // Prioridade 7: importação CSV
  private readonly _csvLoading = signal(false);
  get csvLoading(): boolean { return this._csvLoading(); }
  set csvLoading(v: boolean) { this._csvLoading.set(v); }
  private readonly _csvError = signal('');
  get csvError(): string { return this._csvError(); }
  set csvError(v: string) { this._csvError.set(v); }
  private readonly _csvImported = signal(0);
  get csvImported(): number { return this._csvImported(); }
  set csvImported(v: number) { this._csvImported.set(v); }
  private readonly _csvPreviewRows = signal<InvestmentPositionRequest[]>([]);
  get csvPreviewRows(): InvestmentPositionRequest[] { return this._csvPreviewRows(); }
  set csvPreviewRows(v: InvestmentPositionRequest[]) { this._csvPreviewRows.set(v); }

  readonly currencyOptions: readonly string[] = SUPPORTED_CURRENCIES;

  novaPosicao: Omit<InvestmentPosition, 'id' | 'movements'> = {
    type: 'RF',
    asset: '',
    quantity: 0,
    avgPrice: 0,
    openedAt: new Date().toISOString().slice(0, 10),
    account: '',
    category: '',
    currency: 'BRL'
  };

  movimento: { type: MovementType; quantity: number; price: number; date: string; note?: string } = {
    type: 'COMPRA',
    quantity: 0,
    price: 0,
    date: new Date().toISOString().slice(0, 10),
    note: ''
  };
  cadastroCustos = 0;
  movimentoCustos = 0;
  vendaPositionId = '';
  venda: { quantity: number; price: number; date: string; note?: string } = {
    quantity: 0,
    price: 0,
    date: new Date().toISOString().slice(0, 10),
    note: ''
  };

  tipos: { value: InvestmentType; label: string }[] = [
    { value: 'RF', label: 'Renda Fixa' },
    { value: 'ACOES', label: 'Ações/ETFs' },
    { value: 'FUNDOS', label: 'Fundos' },
    { value: 'CRIPTO', label: 'Cripto' },
    { value: 'IMOVEL', label: 'Imóvel' },
    { value: 'VEICULO', label: 'Veículo' }
  ];

  movimentoTipos: { value: MovementType; label: string }[] = [
    { value: 'COMPRA', label: 'Compra' },
    { value: 'VENDA', label: 'Venda' }
  ];

  constructor(private investments: InvestmentsService, private lookups: LookupsService, private uiFeedback: UiFeedbackService, private readonly destroyRef: DestroyRef, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.restoreTab();
    this.carregarAlocacaoTarget();
    this.carregarMeta();
    this.carregarPosicoes();
    this.lookups.institutions('Broker').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => (this.institutions = items || []),
      error: () => (this.institutions = [])
    });
  }

  get overview(): InvestmentsOverview {
    return buildInvestmentsOverview(this.positions);
  }

  get investmentTabOptions(): SegmentOption[] {
    return this.tabs.map((t) => ({ value: t.key, label: t.label }));
  }

  setTab(value: string): void {
    this.setActiveTab(value as InvestmentsTab);
  }

  get patrimonioAtual(): number {
    return this.positions.reduce((sum, p) => sum + p.quantity * p.avgPrice, 0);
  }

  get aporteMes(): number {
    const now = new Date();
    return this.positions.reduce((sum, pos) => {
      const movimentosMes = pos.movements.filter((mov) => isCurrentMonth(mov.date, now));
      return (
        sum +
        movimentosMes
          .filter((mov) => mov.type === 'APORTE' || mov.type === 'COMPRA')
          .reduce((acc, mov) => acc + mov.quantity * mov.price, 0)
      );
    }, 0);
  }

  get resgateMes(): number {
    const now = new Date();
    return this.positions.reduce((sum, pos) => {
      const movimentosMes = pos.movements.filter((mov) => isCurrentMonth(mov.date, now));
      return (
        sum +
        movimentosMes
          .filter((mov) => mov.type === 'RESGATE' || mov.type === 'VENDA')
          .reduce((acc, mov) => acc + mov.quantity * mov.price, 0)
      );
    }, 0);
  }

  get resultadoMes(): number {
    return this.aporteMes - this.resgateMes;
  }

  get totalPosicoesAtivas(): number {
    return this.filteredPositions.filter((p) => p.quantity > 0).length;
  }

  get totalPosicoesZeradas(): number {
    return this.filteredPositions.filter((p) => p.quantity <= 0).length;
  }

  get contasDisponiveis(): string[] {
    const set = new Set<string>();
    for (const pos of this.positions) if (pos.account?.trim()) set.add(pos.account.trim());
    for (const inst of this.institutions) if (inst.name?.trim()) set.add(inst.name.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get posicoesVendaveis(): InvestmentPosition[] {
    return this.positions
      .filter((p) => p.quantity > 0)
      .sort((a, b) => a.asset.localeCompare(b.asset, 'pt-BR'));
  }

  get filteredPositions(): InvestmentPosition[] {
    const text = normalize(this.searchTerm);
    return this.positions.filter((p) => {
      const typeOk = this.filterType === 'ALL' || p.type === this.filterType;
      const accountOk = this.filterAccount === 'ALL' || (p.account || '').trim() === this.filterAccount;
      const statusOk = this.filterStatus === 'ALL' || (this.filterStatus === 'ACTIVE' ? p.quantity > 0 : p.quantity <= 0);
      const textOk = !text || normalize(p.asset).includes(text) || normalize(p.account || '').includes(text) || normalize(p.category || '').includes(text);
      return typeOk && accountOk && statusOk && textOk;
    });
  }

  get sortedPositions(): InvestmentPosition[] {
    const list = [...this.filteredPositions];
    const direction = this.sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const statusA = a.quantity > 0 ? 1 : 0;
      const statusB = b.quantity > 0 ? 1 : 0;
      const valueA = positionCurrentValue(a);
      const valueB = positionCurrentValue(b);
      const resultA = this.resultadoPosicao(a);
      const resultB = this.resultadoPosicao(b);
      const portfolioA = this.percentualNaCarteira(a);
      const portfolioB = this.percentualNaCarteira(b);
      const currentReturnA = this.rentabilidadeAtualPercent(a);
      const currentReturnB = this.rentabilidadeAtualPercent(b);
      const paperTypeA = this.tipoPapel(a);
      const paperTypeB = this.tipoPapel(b);

      switch (this.sortBy) {
        case 'paperType':
          return paperTypeA.localeCompare(paperTypeB, 'pt-BR') * direction;
        case 'status':
          return (statusA - statusB) * direction;
        case 'quantity':
          return ((a.quantity || 0) - (b.quantity || 0)) * direction;
        case 'avgPrice':
          return ((a.avgPrice || 0) - (b.avgPrice || 0)) * direction;
        case 'currentValue':
          return (valueA - valueB) * direction;
        case 'portfolioPercent':
          return (portfolioA - portfolioB) * direction;
        case 'currentReturn':
          return (currentReturnA - currentReturnB) * direction;
        case 'estimatedResult':
          return (resultA - resultB) * direction;
        case 'asset':
        default:
          return a.asset.localeCompare(b.asset, 'pt-BR') * direction;
      }
    });
    return list;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.sortedPositions.length / this.pageSize));
  }

  get pagedPositions(): InvestmentPosition[] {
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedPositions.slice(start, start + this.pageSize);
  }

  get pageLabel(): string {
    const total = this.sortedPositions.length;
    if (!total) return '0 de 0';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, total);
    return `${start}-${end} de ${total}`;
  }

  percentualNaCarteira(pos: InvestmentPosition): number {
    if (!this.patrimonioAtual) return 0;
    return (this.valorAtualPosicao(pos) / this.patrimonioAtual) * 100;
  }

  rentabilidadeAtualPercent(pos: InvestmentPosition): number {
    return this.resultadoPosicaoPercentual(pos);
  }

  tipoPapel(pos: InvestmentPosition): string {
    if (pos.type === 'IMOVEL') return 'Patrimônio';
    if (pos.type === 'VEICULO') return 'Patrimônio';
    if (pos.type === 'FUNDOS') return 'Cotas';
    const ticker = (pos.asset || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const match = ticker.match(/(\d{1,2})$/);
    const code = match?.[1] ?? '';

    if (code === '3') return 'ON';
    if (code === '4') return 'PN';
    if (code === '5') return 'PNA';
    if (code === '6') return 'PNB';
    if (code === '11') return pos.type === 'ACOES' ? 'UNT' : 'Cotas';
    return '-';
  }

  marketPrice(pos: InvestmentPosition): number | null {
    return pos.marketPrice ?? null;
  }

  variacaoPrecoPercent(pos: InvestmentPosition): number | null {
    const market = this.marketPrice(pos);
    const avg = pos.avgPrice || 0;
    if (market === null || avg <= 0) return null;
    return ((market / avg) - 1) * 100;
  }

  marketLogo(pos: InvestmentPosition): string | null {
    return pos.marketLogoUrl ?? null;
  }

  marketLabel(pos: InvestmentPosition): string | null {
    return pos.marketName ?? null;
  }

  get hasRebalanceAlert(): boolean {
    return this.alvoAlocacao.some((item) => item.alerta);
  }

  // Observação factual da carteira — nunca recomendação de compra/venda de ativos.
  get proximaAcao(): { titulo: string; descricao: string; cta: string; targetId?: string; openForm?: boolean } {
    if (this.hasRebalanceAlert) {
      return {
        titulo: 'Alocação fora do alvo definido',
        descricao: 'Uma ou mais classes estão a mais de 7 p.p. do alvo que você configurou.',
        cta: 'Ver alocação',
        targetId: 'sec-alocacao'
      };
    }

    if (this.aporteMes <= 0) {
      return {
        titulo: 'Sem aportes neste mês',
        descricao: 'Você ainda não registrou aportes no mês atual.',
        cta: 'Registrar lançamento',
        openForm: true
      };
    }

    if (this.metaPatrimonio > 0 && this.progressoMeta < 100) {
      return {
        titulo: 'Progresso da meta de patrimônio',
        descricao: `Faltam ${this.currencyFormatter.format(this.faltaMeta)} para a meta que você definiu.`,
        cta: 'Ver evolução',
        targetId: 'sec-evolucao'
      };
    }

    return {
      titulo: 'Alocação alinhada ao seu alvo',
      descricao: 'Sua carteira está sem desvios relevantes em relação ao alvo definido.',
      cta: 'Ver evolução',
      targetId: 'sec-evolucao'
    };
  }

  get distribuicaoPorTipo(): { key: InvestmentType; label: string; value: number; percent: number }[] {
    const total = this.filteredPositions.reduce((sum, p) => sum + positionCurrentValue(p), 0);
    return this.tipos
      .map((tipo) => {
        const value = this.filteredPositions.filter((p) => p.type === tipo.value).reduce((sum, p) => sum + positionCurrentValue(p), 0);
        return { key: tipo.value, label: tipo.label, value, percent: total > 0 ? (value / total) * 100 : 0 };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  get distribuicaoPorTipoComCor(): { key: InvestmentType; label: string; value: number; percent: number; color: string }[] {
    const palette: Record<InvestmentType, string> = {
      RF: 'var(--color-chart-series-1)',
      ACOES: 'var(--color-chart-income)',
      FUNDOS: 'var(--color-chart-series-5)',
      CRIPTO: 'var(--color-chart-series-3)',
      IMOVEL: 'var(--color-chart-investment)',
      VEICULO: 'var(--color-chart-expense)'
    };
    return this.distribuicaoPorTipo.map((item) => ({ ...item, color: palette[item.key] }));
  }


  get evolucaoMensalSeries(): ChartBucket[] {
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
      });
    }

    const map = new Map<string, ChartBucket>(months.map((m) => [m.key, { key: m.key, label: m.label, aporte: 0, resgate: 0, proventos: 0, saldo: 0 }]));

    for (const pos of this.positions) {
      for (const mov of pos.movements || []) {
        if (!mov?.date) continue;
        const [y, m] = mov.date.split('T')[0].split('-');
        const bucket = map.get(`${y}-${m}`);
        if (!bucket) continue;
        const value = (mov.quantity || 0) * (mov.price || 0);
        switch (mov.type) {
          case 'APORTE':
          case 'COMPRA':
            bucket.aporte += value;
            bucket.saldo += value;
            break;
          case 'RESGATE':
          case 'VENDA':
            bucket.resgate += value;
            bucket.saldo -= value;
            break;
          case 'DIVIDENDO':
          case 'JCP':
          case 'RENDIMENTO':
            bucket.proventos += value;
            bucket.saldo += value;
            break;
          default:
            break;
        }
      }
    }

    return months.map((m) => map.get(m.key)!);
  }

  get patrimonioEvolucaoSeries(): PatrimonioBucket[] {
    const months = this.patrimonioRangeMonths === 6 ? 6 : 12;
    const now = new Date();
    const timeline: { key: string; label: string }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      timeline.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' })
      });
    }

    const flowByMonth = new Map<string, { aplicado: number; ganho: number }>(
      timeline.map((m) => [m.key, { aplicado: 0, ganho: 0 }])
    );

    for (const pos of this.positions) {
      if (this.patrimonioTypeFilter !== 'ALL' && pos.type !== this.patrimonioTypeFilter) continue;
      for (const mov of pos.movements || []) {
        if (!mov?.date) continue;
        const [y, m] = mov.date.split('T')[0].split('-');
        const bucket = flowByMonth.get(`${y}-${m}`);
        if (!bucket) continue;

        const value = (mov.quantity || 0) * (mov.price || 0);
        if (mov.type === 'COMPRA' || mov.type === 'APORTE') bucket.aplicado += value;
        if (mov.type === 'VENDA' || mov.type === 'RESGATE') bucket.aplicado -= value;
        if (mov.type === 'DIVIDENDO' || mov.type === 'JCP' || mov.type === 'RENDIMENTO') bucket.ganho += value;
      }
    }

    let aplicadoAcumulado = 0;
    let ganhoAcumulado = 0;
    const computed = timeline.map((m) => {
      const flow = flowByMonth.get(m.key)!;
      aplicadoAcumulado += flow.aplicado;
      ganhoAcumulado += flow.ganho;
      const aplicado = Math.max(aplicadoAcumulado, 0);
      const ganho = ganhoAcumulado;
      return { key: m.key, label: m.label, aplicado, ganho, total: aplicado + ganho };
    });

    const nonZeroPoints = computed.filter((x) => x.total > 0).length;
    if (nonZeroPoints <= 1) {
      const aplicadoAtual = Math.max(this.aporteTotal, 0);
      const ganhoAtual = this.crescimentoEstimado;
      return computed.map((x) => ({
        ...x,
        aplicado: aplicadoAtual,
        ganho: ganhoAtual,
        total: aplicadoAtual + ganhoAtual
      }));
    }

    return computed;
  }

  get patrimonioChartMax(): number {
    return this.patrimonioEvolucaoSeries.reduce((max, item) => Math.max(max, item.total), 0) || 1;
  }

  get patrimonioEvolucaoEstimado(): boolean {
    const series = this.patrimonioEvolucaoSeries;
    if (series.length <= 1) return false;
    const first = series[0].total;
    return series.every((item) => Math.abs(item.total - first) < 0.0001);
  }

  get patrimonioGridColumns(): string {
    return `repeat(${Math.max(this.patrimonioEvolucaoSeries.length, 1)}, minmax(0, 1fr))`;
  }

  get patrimonioAxisTicks(): number[] {
    const steps = 6;
    const max = Math.max(this.patrimonioChartMax, 1);
    const roughStep = max / steps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / magnitude;
    const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    const niceStep = niceNormalized * magnitude;
    const top = niceStep * steps;
    return Array.from({ length: steps + 1 }, (_, i) => top - i * niceStep);
  }

  get carteiraDistribuicaoChart(): { key: InvestmentType; label: string; value: number; percent: number; color: string }[] {
    const base = this.distribuicaoPorTipoComCor;
    if (this.carteiraTypeFilter === 'ALL') return base;
    return base.filter((item) => item.key === this.carteiraTypeFilter);
  }


  get evolucaoMaxValor(): number {
    return this.evolucaoMensalSeries.reduce((max, item) => Math.max(max, item.aporte, item.resgate, item.proventos), 0) || 1;
  }

  get proventosMensaisSeries(): ProventoMonthBucket[] {
    const now = new Date();
    const months: ProventoMonthBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' }),
        total: 0
      });
    }

    const byMonth = new Map(months.map((m) => [m.key, m]));
    for (const pos of this.positions) {
      for (const mov of pos.movements || []) {
        if (!mov?.date || !isProventoMovement(mov.type)) continue;
        const [year, month] = mov.date.split('T')[0].split('-');
        const bucket = byMonth.get(`${year}-${month}`);
        if (!bucket) continue;
        bucket.total += (mov.quantity || 0) * (mov.price || 0);
      }
    }

    return months;
  }

  get proventosMensaisMax(): number {
    return this.proventosMensaisSeries.reduce((max, item) => Math.max(max, item.total), 0) || 1;
  }

  get proventosTotal12Meses(): number {
    return this.proventosMensaisSeries.reduce((sum, item) => sum + item.total, 0);
  }

  get proventosMedia12Meses(): number {
    return this.proventosTotal12Meses / 12;
  }

  get proventosPorAtivo12Meses(): { asset: string; total: number; percent: number }[] {
    const totals = new Map<string, number>();
    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() - 11);
    limitDate.setDate(1);

    for (const pos of this.positions) {
      for (const mov of pos.movements || []) {
        if (!mov?.date || !isProventoMovement(mov.type)) continue;
        const movDate = new Date(mov.date);
        if (Number.isNaN(movDate.getTime()) || movDate < limitDate) continue;
        const value = (mov.quantity || 0) * (mov.price || 0);
        totals.set(pos.asset, (totals.get(pos.asset) || 0) + value);
      }
    }

    const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(totals.entries())
      .map(([asset, value]) => ({
        asset,
        total: value,
        percent: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }

  get proventosAtivosPagadores(): number {
    return this.proventosPorAtivo12Meses.length;
  }

  get aporteTotal(): number {
    return this.positions.reduce((sum, pos) => sum + positionNetContributed(pos), 0);
  }

  get crescimentoEstimado(): number {
    return this.patrimonioAtual - this.aporteTotal;
  }

  get progressoMeta(): number {
    if (!this.metaPatrimonio) return 0;
    return Math.min((this.patrimonioAtual / this.metaPatrimonio) * 100, 100);
  }

  get faltaMeta(): number {
    if (!this.metaPatrimonio) return 0;
    return Math.max(this.metaPatrimonio - this.patrimonioAtual, 0);
  }

  get rentabilidadeAcumuladaPercent(): number {
    if (!this.aporteTotal) return 0;
    return (this.crescimentoEstimado / this.aporteTotal) * 100;
  }

  get rentabilidadeMensalPercent(): number {
    const ultimo = this.evolucaoMensalSeries[this.evolucaoMensalSeries.length - 1];
    const base = Math.max(this.patrimonioAtual - (ultimo?.saldo || 0), 1);
    return ((ultimo?.saldo || 0) / base) * 100;
  }

  get rentabilidadeDiariaPercent(): number {
    return this.rentabilidadeMensalPercent / 22;
  }

  get rentabilidadeSeriesFull(): RentabilidadeMonthPoint[] {
    const movimentos = this.positions
      .filter((p) => this.rentabilidadeTipoFiltro === 'ALL' || p.type === this.rentabilidadeTipoFiltro)
      .flatMap((p) => (p.movements || []).map((m) => ({ movement: m })))
      .filter((entry) => !!entry.movement?.date);

    const now = new Date();
    const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const minDate = movimentos.length
      ? movimentos
          .map((entry) => new Date(entry.movement.date))
          .filter((d) => !Number.isNaN(d.getTime()))
          .sort((a, b) => a.getTime() - b.getTime())[0]
      : new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const monthMap = new Map<string, { aporte: number; resgate: number; proventos: number }>();

    for (let cursor = new Date(start); cursor <= nowMonth; cursor.setMonth(cursor.getMonth() + 1)) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { aporte: 0, resgate: 0, proventos: 0 });
    }

    for (const pos of this.positions) {
      if (this.rentabilidadeTipoFiltro !== 'ALL' && pos.type !== this.rentabilidadeTipoFiltro) continue;
      for (const mov of pos.movements || []) {
        if (!mov?.date) continue;
        const date = new Date(mov.date);
        if (Number.isNaN(date.getTime())) continue;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthMap.get(key);
        if (!bucket) continue;
        const value = (mov.quantity || 0) * (mov.price || 0);
        if (mov.type === 'COMPRA' || mov.type === 'APORTE') bucket.aporte += value;
        if (mov.type === 'VENDA' || mov.type === 'RESGATE') bucket.resgate += value;
        if (isProventoMovement(mov.type)) bucket.proventos += value;
      }
    }

    const points: RentabilidadeMonthPoint[] = [];
    let baseCapital = 0;
    let carteiraAc = 0;
    let benchmarkAc = 0;
    const benchmarkMesFixo = benchmarkMonthPercent(this.rentabilidadeBenchmark);

    for (const [key, bucket] of monthMap) {
      const [yearText, monthText] = key.split('-');
      const year = Number(yearText);
      const month = Number(monthText);
      baseCapital = Math.max(baseCapital + bucket.aporte - bucket.resgate, 0);
      const carteiraMes = baseCapital > 0 ? (bucket.proventos / baseCapital) * 100 : 0;
      carteiraAc = ((1 + carteiraAc / 100) * (1 + carteiraMes / 100) - 1) * 100;
      benchmarkAc = ((1 + benchmarkAc / 100) * (1 + benchmarkMesFixo / 100) - 1) * 100;
      points.push({
        key,
        year,
        month,
        label: `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`,
        carteiraMes,
        benchmarkMes: benchmarkMesFixo,
        carteiraAc,
        benchmarkAc
      });
      baseCapital += bucket.proventos;
    }

    return points;
  }

  get rentabilidadeSeries(): RentabilidadeMonthPoint[] {
    const full = this.rentabilidadeSeriesFull;
    if (this.rentabilidadePeriodo === 'LAST_12M') return full.slice(-12);
    return full;
  }

  get rentabilidadeTotalPercent(): number {
    const last = this.rentabilidadeSeriesFull[this.rentabilidadeSeriesFull.length - 1];
    return last?.carteiraAc || 0;
  }

  get rentabilidadeTotalCdiPercent(): number {
    const last = this.rentabilidadeSeriesFull[this.rentabilidadeSeriesFull.length - 1];
    return last?.benchmarkAc || 0;
  }

  get rentabilidade12mPercent(): number {
    const points = this.rentabilidadeSeriesFull.slice(-12);
    if (!points.length) return 0;
    return points.reduce((acc, p) => ((1 + acc / 100) * (1 + p.carteiraMes / 100) - 1) * 100, 0);
  }

  get rentabilidade12mCdiPercent(): number {
    const points = this.rentabilidadeSeriesFull.slice(-12);
    if (!points.length) return 0;
    return points.reduce((acc, p) => ((1 + acc / 100) * (1 + p.benchmarkMes / 100) - 1) * 100, 0);
  }

  get rentabilidadeUltimoMesPercent(): number {
    const last = this.rentabilidadeSeriesFull[this.rentabilidadeSeriesFull.length - 1];
    return last?.carteiraMes || 0;
  }

  get rentabilidadeUltimoMesCdiPercent(): number {
    const last = this.rentabilidadeSeriesFull[this.rentabilidadeSeriesFull.length - 1];
    return last?.benchmarkMes || 0;
  }

  get rentabilidadeChartMin(): number {
    const values = this.rentabilidadeSeries.flatMap((point) => [point.carteiraAc, point.benchmarkAc]);
    const min = Math.min(...values, 0);
    return Math.floor(min / 5) * 5;
  }

  get rentabilidadeChartMax(): number {
    const values = this.rentabilidadeSeries.flatMap((point) => [point.carteiraAc, point.benchmarkAc]);
    const max = Math.max(...values, 0);
    const padded = max <= 0 ? 5 : max * 1.15;
    return Math.ceil(padded / 5) * 5;
  }

  get rentabilidadeChartTicks(): number[] {
    const min = this.rentabilidadeChartMin;
    const max = this.rentabilidadeChartMax;
    const steps = 5;
    const span = max - min || 1;
    return Array.from({ length: steps + 1 }, (_, i) => max - (span / steps) * i);
  }

  get rentabilidadeLinhaCarteira(): string {
    return this.buildRentabilidadePolyline('carteiraAc');
  }

  get rentabilidadeLinhaCdi(): string {
    return this.buildRentabilidadePolyline('benchmarkAc');
  }

  get indiceSelecionadoLabel(): string {
    return this.benchmarkOptions.find((item) => item.key === this.rentabilidadeBenchmark)?.label || 'Índice';
  }

  get indiceSelecionadoCor(): string {
    return this.benchmarkOptions.find((item) => item.key === this.rentabilidadeBenchmark)?.color || 'var(--warning)';
  }

  get rentabilidadeTabelaAnual(): ProfitabilityYearRow[] {
    const byYear = new Map<number, RentabilidadeMonthPoint[]>();
    for (const point of this.rentabilidadeSeriesFull) {
      const list = byYear.get(point.year) || [];
      list.push(point);
      byYear.set(point.year, list);
    }

    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, points]) => {
        const months: Array<number | null> = Array.from({ length: 12 }, () => null);
        for (const point of points) months[point.month - 1] = point.carteiraMes;
        const yearValue = points.reduce((acc, p) => ((1 + acc / 100) * (1 + p.carteiraMes / 100) - 1) * 100, 0);
        const acumulado = points[points.length - 1]?.carteiraAc || 0;
        return { year, months, yearValue, acumulado };
      });
  }

  private buildRentabilidadePolyline(field: 'carteiraAc' | 'benchmarkAc'): string {
    const points = this.rentabilidadeSeries;
    if (!points.length) return '';
    const width = 1000;
    const height = 280;
    const min = this.rentabilidadeChartMin;
    const max = this.rentabilidadeChartMax;
    const span = max - min || 1;
    return points
      .map((point, index) => {
        const x = (index / Math.max(points.length - 1, 1)) * width;
        const y = height - (((point[field] - min) / span) * height);
        return `${x},${y}`;
      })
      .join(' ');
  }

  get consolidacaoSeries(): ConsolidacaoBucket[] {
    const now = new Date();
    const start = new Date(now.getFullYear() - this.consolidacaoHorizonteAnos + 1, now.getMonth(), 1);
    const months: ConsolidacaoBucket[] = [];
    const cursor = new Date(start);

    while (cursor <= now) {
      months.push({
        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
        label: cursor.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
        compras: 0,
        vendas: 0
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const byMonth = new Map(months.map((m) => [m.key, m]));
    for (const row of this.consolidacaoRows) {
      const date = new Date(row.date);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = byMonth.get(key);
      if (!bucket) continue;
      if (row.ordem === 'Compra') bucket.compras += row.total;
      if (row.ordem === 'Venda') bucket.vendas += row.total;
    }

    return months;
  }

  get consolidacaoChartMax(): number {
    return this.consolidacaoSeries.reduce((max, item) => Math.max(max, item.compras, item.vendas), 0) || 1;
  }

  get consolidacaoRows(): ConsolidacaoMovimentoRow[] {
    const rows: ConsolidacaoMovimentoRow[] = [];
    const horizonStart = new Date();
    horizonStart.setFullYear(horizonStart.getFullYear() - this.consolidacaoHorizonteAnos);
    const text = normalize(this.consolidacaoSearchTerm);

    for (const pos of this.positions) {
      if (this.consolidacaoTipoFiltro !== 'ALL' && pos.type !== this.consolidacaoTipoFiltro) continue;
      const relevant = (pos.movements || [])
        .filter((mov) => mov.type === 'COMPRA' || mov.type === 'VENDA')
        .map((mov, idx) => ({ mov, idx }))
        .sort((a, b) => new Date(a.mov.date).getTime() - new Date(b.mov.date).getTime());

      let runningQty = 0;
      for (const entry of relevant) {
        const date = new Date(entry.mov.date);
        if (Number.isNaN(date.getTime())) continue;
        runningQty += entry.mov.type === 'COMPRA' ? entry.mov.quantity : -entry.mov.quantity;

        if (date < horizonStart) continue;
        const source: 'B3' | 'Manual' = (entry.mov.note || '').toUpperCase().includes('B3') ? 'B3' : 'Manual';
        if (text && !normalize(pos.asset).includes(text)) continue;

        rows.push({
          id: `${pos.id}-${entry.idx}`,
          asset: pos.asset,
          investmentType: pos.type,
          ordem: entry.mov.type === 'COMPRA' ? 'Compra' : 'Venda',
          quantity: entry.mov.quantity,
          unitPrice: entry.mov.price,
          total: entry.mov.quantity * entry.mov.price,
          quantityAfter: runningQty,
          date: entry.mov.date,
          source
        });
      }
    }

    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  get mesesComparativo(): number {
    return Math.max(this.evolucaoMensalSeries.length, 1);
  }

  get alvoAlocacao(): { key: InvestmentType; label: string; alvo: number; atual: number; desvio: number; alerta: boolean }[] {
    const atualMap = new Map(this.distribuicaoPorTipo.map((i) => [i.key, i.percent]));
    return this.allocationTypes.map((t) => {
      const atual = atualMap.get(t.value) || 0;
      const desvio = atual - this.targetAllocation[t.value];
      return { key: t.value, label: t.label, alvo: this.targetAllocation[t.value], atual, desvio, alerta: Math.abs(desvio) >= 7 };
    });
  }

  get allocationTypes(): Array<{ value: AllocationInvestmentType; label: string }> {
    return this.tipos.filter((t): t is { value: AllocationInvestmentType; label: string } => isAllocationType(t.value));
  }

  get targetAllocationTotal(): number {
    return this.targetAllocation.RF + this.targetAllocation.ACOES + this.targetAllocation.FUNDOS + this.targetAllocation.CRIPTO;
  }

  updateTargetAllocation(type: AllocationInvestmentType, value: number): void {
    const safe = Number.isFinite(value) ? value : 0;
    this.targetAllocation = { ...this.targetAllocation, [type]: Math.min(100, Math.max(0, safe)) };
  }

  saveTargetAllocation(): void {
    if (Math.abs(this.targetAllocationTotal - 100) > 0.001) {
      this.uiFeedback.error('A soma da alocação alvo precisa fechar em 100%.');
      return;
    }
    this.investments.upsertAllocationTarget({
      rf: this.targetAllocation.RF,
      acoes: this.targetAllocation.ACOES,
      fundos: this.targetAllocation.FUNDOS,
      cripto: this.targetAllocation.CRIPTO
    }).subscribe({
      next: (response) => {
        this.targetAllocation = mapTargetAllocationResponse(response);
        this.showAlocacaoConfig = false;
        this.uiFeedback.success('Alocação alvo salva.');
      },
      error: (err) => this.uiFeedback.error(resolveApiErrorMessage(err, 'Falha ao salvar alocação alvo.'))
    });
  }

  resetTargetAllocation(): void {
    this.targetAllocation = { ...DEFAULT_TARGET_ALLOCATION };
    this.saveTargetAllocation();
  }

  ordenarPor(column: PositionSortKey): void {
    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDir = column === 'asset' ? 'asc' : 'desc';
    }
    this.currentPage = 1;
  }

  sortIcon(column: PositionSortKey): string {
    if (this.sortBy !== column) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  onFiltroMudou(): void {
    this.currentPage = 1;
  }

  mudarPagina(delta: number): void {
    const next = this.currentPage + delta;
    if (next < 1 || next > this.totalPages) return;
    this.currentPage = next;
  }

  executarProximaAcao(): void {
    const action = this.proximaAcao;
    if (action.openForm) {
      this.openCadastroModal();
      return;
    }
    if (action.targetId) {
      this.ensureTabForTarget(action.targetId);
      this.scrollToSection(action.targetId);
    }
  }

  setActiveTab(tab: InvestmentsTab): void {
    this.activeTab = tab;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.tabStorageKey, tab);
    }
  }

  tooltipMes(item: ChartBucket): string {
    return [
      `${item.label}`,
      `Aportes: ${this.currencyFormatter.format(item.aporte)}`,
      `Resgates: ${this.currencyFormatter.format(item.resgate)}`,
      `Proventos: ${this.currencyFormatter.format(item.proventos)}`,
      `Saldo: ${this.currencyFormatter.format(item.saldo)}`
    ].join('\n');
  }

  valorAtualPosicao(pos: InvestmentPosition): number {
    return positionCurrentValue(pos);
  }

  resultadoPosicao(pos: InvestmentPosition): number {
    return positionCurrentValue(pos) - positionNetContributed(pos);
  }

  resultadoPosicaoPercentual(pos: InvestmentPosition): number {
    const base = positionNetContributed(pos);
    return base ? (this.resultadoPosicao(pos) / base) * 100 : 0;
  }

  formatarMeta(): void {
    this.metaPatrimonioInput = maskMoneyInput(this.metaPatrimonioInput);
    this.metaPatrimonio = this.parseValor(this.metaPatrimonioInput);
  }

  salvarMeta(): void {
    if (!this.metaPatrimonio) return;
    this.metaSalvando = true;
    this.investments.upsertGoal(this.metaPatrimonio).subscribe({
      next: (goal) => {
        this.metaPatrimonio = goal.targetAmount || 0;
        this.metaPatrimonioInput = formatNumberValue(this.metaPatrimonio);
        this.metaSalvando = false;
      },
      error: () => (this.metaSalvando = false)
    });
  }

  async salvarPosicao(): Promise<void> {
    if (!this.novaPosicao.asset || this.novaPosicao.quantity <= 0 || this.novaPosicao.avgPrice <= 0) return;
    const custos = this.cadastroCustos > 0 ? this.cadastroCustos : 0;
    const avgPriceComCustos = custos > 0
      ? ((this.novaPosicao.quantity * this.novaPosicao.avgPrice) + custos) / this.novaPosicao.quantity
      : this.novaPosicao.avgPrice;
    const payload: InvestmentPositionRequest = {
      ...this.novaPosicao,
      avgPrice: avgPriceComCustos,
      category: this.novaPosicao.category || ''
    };
    try {
      await firstValueFrom(this.investments.createPosition(payload));
      this.resetPosicao();
      this.showCadastro = false;
      this.carregarPosicoes();
      this.uiFeedback.success('Posição cadastrada com sucesso.');
    } catch (err: unknown) {
      this.uiFeedback.error(resolveApiErrorMessage(err, 'Falha ao cadastrar posição.'));
    }
  }

  async salvarVenda(): Promise<void> {
    if (!this.vendaPositionId || this.venda.quantity <= 0 || this.venda.price <= 0) return;

    const position = this.positions.find((p) => p.id === this.vendaPositionId);
    if (!position) {
      this.uiFeedback.error('Selecione uma posição válida para venda.');
      return;
    }

    if (this.venda.quantity > position.quantity) {
      this.uiFeedback.error(`Quantidade de venda maior que a posição atual (${position.quantity}).`);
      return;
    }

    const custos = this.cadastroCustos > 0 ? this.cadastroCustos : 0;
    const noteParts = [this.venda.note?.trim(), custos > 0 ? `Custos: ${this.currencyFormatter.format(custos)}` : ''].filter(Boolean);

    try {
      await firstValueFrom(this.investments.addMovement(this.vendaPositionId, {
        type: 'VENDA',
        quantity: this.venda.quantity,
        price: this.venda.price,
        date: this.venda.date,
        note: noteParts.join(' | ') || undefined
      }));
      this.uiFeedback.success('Venda registrada com sucesso.');
      this.closeCadastroModal();
      this.carregarPosicoes();
    } catch (err: unknown) {
      this.uiFeedback.error(resolveApiErrorMessage(err, 'Falha ao registrar venda.'));
    }
  }

  abrirMovimento(pos: InvestmentPosition): void {
    // Unifica o fluxo no modal principal "Novo lançamento".
    this.setCadastroOperacao('VENDA');
    this.vendaPositionId = pos.id;
    this.onVendaPositionChange();
    this.showCadastro = true;
  }

  salvarMovimento(): void {
    if (!this.selectedId || this.movimento.quantity <= 0 || this.movimento.price <= 0) return;
    const custos = this.movimentoCustos > 0 ? this.movimentoCustos : 0;
    const noteParts = [this.movimento.note?.trim(), custos > 0 ? `Custos: ${this.currencyFormatter.format(custos)}` : ''].filter(Boolean);
    this.investments.addMovement(this.selectedId, { ...this.movimento, note: noteParts.join(' | ') || undefined }).subscribe({
      next: () => {
        this.mode = 'create';
        this.selectedId = null;
        this.posSelecionada = null;
        this.showMovimento = false;
        this.carregarPosicoes();
      },
      error: (err) => this.uiFeedback.error(resolveApiErrorMessage(err, 'Falha ao registrar movimento.'))
    });
  }

  resetPosicao(): void {
    this.novaPosicao = {
      type: 'RF', asset: '', quantity: 0, avgPrice: 0,
      openedAt: new Date().toISOString().slice(0, 10), account: '', category: '', currency: 'BRL'
    };
    this.cadastroCustos = 0;
  }

  resetVenda(): void {
    this.vendaPositionId = '';
    this.venda = {
      quantity: 0,
      price: 0,
      date: new Date().toISOString().slice(0, 10),
      note: ''
    };
    this.cadastroCustos = 0;
  }

  onVendaPositionChange(): void {
    const pos = this.positions.find((p) => p.id === this.vendaPositionId);
    this.venda.price = pos?.avgPrice || 0;
  }

  onVendaPositionSelected(positionId: string): void {
    this.vendaPositionId = positionId;
    this.onVendaPositionChange();
  }

  setCadastroOperacao(tipo: CadastroOperacao): void {
    this.cadastroOperacao = tipo;
    this.cadastroCustos = 0;
    if (tipo === 'COMPRA') {
      this.resetPosicao();
      return;
    }
    this.resetVenda();
    if (this.posicoesVendaveis.length === 1) {
      this.vendaPositionId = this.posicoesVendaveis[0].id;
      this.onVendaPositionChange();
    }
  }

  openCadastroModal(): void {
    this.setCadastroOperacao('COMPRA');
    this.showCadastro = true;
  }

  closeCadastroModal(): void {
    this.showCadastro = false;
    this.resetPosicao();
    this.resetVenda();
    this.cadastroOperacao = 'COMPRA';
  }

  closeMovimentoModal(): void {
    this.showMovimento = false;
    this.posSelecionada = null;
    this.selectedId = null;
    this.movimentoCustos = 0;
  }

  get cadastroValorTotal(): number {
    return (this.novaPosicao.quantity || 0) * (this.novaPosicao.avgPrice || 0) + (this.cadastroCustos || 0);
  }

  get vendaValorTotal(): number {
    return (this.venda.quantity || 0) * (this.venda.price || 0) - (this.cadastroCustos || 0);
  }

  get movimentoValorTotal(): number {
    return (this.movimento.quantity || 0) * (this.movimento.price || 0) + (this.movimentoCustos || 0);
  }

  openB3ImportModal(): void {
    this.showB3Import = true;
    this.b3Error = '';
  }

  closeB3ImportModal(): void {
    if (this.b3Loading || this.b3Importing) return;
    this.showB3Import = false;
    this.b3Error = '';
    this.b3FileName = '';
    this.b3Preview = null;
    this.b3Strategy = 'merge';
  }

  onB3FileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.b3Error = 'Formato inválido. Envie o relatório da B3 em PDF.';
      input.value = '';
      return;
    }

    this.b3FileName = file.name;
    this.b3Error = '';
    this.b3Preview = null;
    this.b3Loading = true;

    this.investments.extractB3Report(file).subscribe({
      next: (preview) => (this.b3Preview = preview),
      error: (err) => (this.b3Error = resolveApiErrorMessage(err, 'Não foi possível ler o relatório da B3.')),
      complete: () => {
        this.b3Loading = false;
        input.value = '';
      }
    });
  }

  confirmarImportacaoB3(): void {
    if (!this.b3Preview?.importToken) {
      this.b3Error = 'Prévia sem token de importação. Extraia o arquivo novamente.';
      return;
    }

    this.b3Importing = true;
    this.b3Error = '';
    this.investments.importB3Report(this.b3Preview.importToken, this.b3Strategy).subscribe({
      next: () => {
        this.uiFeedback.success('Relatório B3 importado com sucesso.');
        this.carregarPosicoes();
        this.b3Importing = false;
        this.closeB3ImportModal();
      },
      error: (err) => (this.b3Error = resolveApiErrorMessage(err, 'Falha ao importar dados da B3.')),
      complete: () => (this.b3Importing = false)
    });
  }

  async onCsvSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.csvError = '';
    this.csvImported = 0;
    this.csvPreviewRows = [];
    this.csvLoading = true;

    try {
      const text = await file.text();
      const rows = parseCsvRows(text);
      if (!rows.length) throw new Error('CSV vazio ou inválido.');

      this.csvPreviewRows = rows.slice(0, 10);
      for (const row of rows) {
        await firstValueFrom(this.investments.createPosition(row));
        this.csvImported++;
      }

      this.uiFeedback.success(`Importação CSV concluída: ${this.csvImported} posição(ões).`);
      this.carregarPosicoes();
    } catch (err: unknown) {
      this.csvError = resolveApiErrorMessage(err, 'Falha ao importar CSV.');
    } finally {
      this.csvLoading = false;
      input.value = '';
    }
  }

  baixarModeloCsv(): void {
    const csv = [
      'type;asset;quantity;avgPrice;openedAt;account;category;note',
      'ACOES;PETR4;100;36,52;2026-01-15;XP;Dividendos;Compra inicial',
      'FUNDOS;HGLG11;8;154,20;2026-01-20;BTG;FII;Posicao para renda mensal'
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-investimentos.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private carregarMeta(): void {
    this.investments.getGoal().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (goal) => {
        if (!goal) return;
        this.metaPatrimonio = goal.targetAmount || 0;
        this.metaPatrimonioInput = this.metaPatrimonio ? formatNumberValue(this.metaPatrimonio) : '';
      }
    });
  }

  private carregarPosicoes(): void {
    this.investments.listPositions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => {
        this.positions = list;
        this.cdr.markForCheck();
      }
    });
  }

  private carregarAlocacaoTarget(): void {
    this.investments.getAllocationTarget().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (target) => {
        this.targetAllocation = mapTargetAllocationResponse(target);
      },
      error: () => {
        this.targetAllocation = { ...DEFAULT_TARGET_ALLOCATION };
        if (!this.allocationLoadWarned) {
          this.uiFeedback.warning('Não foi possível carregar a alocação salva. Mostrando padrão.');
          this.allocationLoadWarned = true;
        }
      }
    });
  }

  private parseValor(raw: string): number {
    return parseLocalizedNumber(raw);
  }

  private scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private ensureTabForTarget(targetId: string): void {
    if (targetId === 'sec-evolucao') {
      this.setActiveTab('RENTABILIDADE');
      return;
    }
    if (targetId === 'sec-alocacao') {
      this.setActiveTab('ANALISE');
      return;
    }
    if (targetId === 'sec-posicoes') {
      this.setActiveTab('RESUMO');
    }
  }

  private restoreTab(): void {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(this.tabStorageKey) as InvestmentsTab | null;
    const exists = saved && this.tabs.some((tab) => tab.key === saved);
    this.activeTab = exists ? saved : 'RESUMO';
    if (!exists) {
      window.localStorage.setItem(this.tabStorageKey, this.activeTab);
    }
  }

  trackByIndex(index: number, _item?: unknown): number {
    return index;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
