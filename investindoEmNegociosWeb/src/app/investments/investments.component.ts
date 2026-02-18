import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { UiFeedbackService } from '../ui-feedback.service';
import { firstValueFrom } from 'rxjs';

type FormMode = 'create' | 'movement';
type CadastroOperacao = 'COMPRA' | 'VENDA';
type InvestmentsTab = 'RESUMO' | 'POSICOES' | 'LANCAMENTOS' | 'PROVENTOS' | 'RENTABILIDADE' | 'ANALISE';
type ChartBucket = { key: string; label: string; aporte: number; resgate: number; proventos: number; saldo: number };
type PositionSortKey = 'asset' | 'paperType' | 'status' | 'quantity' | 'avgPrice' | 'currentValue' | 'portfolioPercent' | 'currentReturn' | 'estimatedResult';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, CurrencyPipe],
  templateUrl: './investments.component.html',
  styleUrls: ['./investments.component.scss']
})
export class InvestmentsComponent implements OnInit {
  private readonly tabStorageKey = 'investments.activeTab';
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  positions: InvestmentPosition[] = [];
  institutions: InstitutionLookup[] = [];
  searchTerm = '';
  filterType: 'ALL' | InvestmentType = 'ALL';
  filterAccount = 'ALL';
  filterStatus: 'ALL' | 'ACTIVE' | 'ZEROED' = 'ALL';
  mode: FormMode = 'create';
  selectedId: string | null = null;
  showCadastro = false;
  showMovimento = false;
  showB3Import = false;
  posSelecionada?: InvestmentPosition | null;
  metaPatrimonioInput = '';
  metaPatrimonio = 0;
  metaSalvando = false;
  b3Loading = false;
  b3Importing = false;
  b3Error = '';
  b3FileName = '';
  b3Strategy: B3ImportStrategy = 'merge';
  b3Preview: B3ExtractResponse | null = null;
  sortBy: PositionSortKey = 'asset';
  sortDir: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 8;
  cadastroOperacao: CadastroOperacao = 'COMPRA';
  activeTab: InvestmentsTab = 'RESUMO';
  tabs: Array<{ key: InvestmentsTab; label: string }> = [
    { key: 'RESUMO', label: 'Resumo' },
    { key: 'POSICOES', label: 'Posições' },
    { key: 'LANCAMENTOS', label: 'Lançamentos' },
    { key: 'PROVENTOS', label: 'Proventos' },
    { key: 'RENTABILIDADE', label: 'Rentabilidade' },
    { key: 'ANALISE', label: 'Análise' }
  ];

  // Prioridade 7: importação CSV
  csvLoading = false;
  csvError = '';
  csvImported = 0;
  csvPreviewRows: InvestmentPositionRequest[] = [];

  novaPosicao: Omit<InvestmentPosition, 'id' | 'movements'> = {
    type: 'RF',
    asset: '',
    quantity: 0,
    avgPrice: 0,
    openedAt: new Date().toISOString().slice(0, 10),
    account: '',
    category: ''
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
    { value: 'CRIPTO', label: 'Cripto' }
  ];

  movimentoTipos: { value: MovementType; label: string }[] = [
    { value: 'COMPRA', label: 'Compra' },
    { value: 'VENDA', label: 'Venda' }
  ];

  constructor(private investments: InvestmentsService, private lookups: LookupsService, private uiFeedback: UiFeedbackService) {}

  ngOnInit(): void {
    this.restoreTab();
    this.carregarMeta();
    this.carregarPosicoes();
    this.lookups.institutions('Broker').subscribe({
      next: (items) => (this.institutions = items || []),
      error: () => (this.institutions = [])
    });
  }

  get patrimonioAtual(): number {
    return this.positions.reduce((sum, p) => sum + p.quantity * p.avgPrice, 0);
  }

  get aporteMes(): number {
    return this.positions.reduce((sum, pos) => {
      const movimentosMes = pos.movements.filter((mov) => this.isCurrentMonth(mov.date));
      return (
        sum +
        movimentosMes
          .filter((mov) => mov.type === 'APORTE' || mov.type === 'COMPRA')
          .reduce((acc, mov) => acc + mov.quantity * mov.price, 0)
      );
    }, 0);
  }

  get resgateMes(): number {
    return this.positions.reduce((sum, pos) => {
      const movimentosMes = pos.movements.filter((mov) => this.isCurrentMonth(mov.date));
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
    const text = this.normalize(this.searchTerm);
    return this.positions.filter((p) => {
      const typeOk = this.filterType === 'ALL' || p.type === this.filterType;
      const accountOk = this.filterAccount === 'ALL' || (p.account || '').trim() === this.filterAccount;
      const statusOk = this.filterStatus === 'ALL' || (this.filterStatus === 'ACTIVE' ? p.quantity > 0 : p.quantity <= 0);
      const textOk = !text || this.normalize(p.asset).includes(text) || this.normalize(p.account || '').includes(text) || this.normalize(p.category || '').includes(text);
      return typeOk && accountOk && statusOk && textOk;
    });
  }

  get sortedPositions(): InvestmentPosition[] {
    const list = [...this.filteredPositions];
    const direction = this.sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const statusA = a.quantity > 0 ? 1 : 0;
      const statusB = b.quantity > 0 ? 1 : 0;
      const valueA = this.positionCurrentValue(a);
      const valueB = this.positionCurrentValue(b);
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

  get hasRebalanceAlert(): boolean {
    return this.alvoAlocacao.some((item) => item.alerta);
  }

  get proximaAcao(): { titulo: string; descricao: string; cta: string; targetId?: string; openForm?: boolean } {
    if (this.hasRebalanceAlert) {
      return {
        titulo: 'Rebalancear carteira',
        descricao: 'Existe classe com desvio maior que 7 p.p. do alvo. Vale revisar a alocação.',
        cta: 'Ver alocação',
        targetId: 'sec-alocacao'
      };
    }

    if (this.aporteMes <= 0) {
      return {
        titulo: 'Registrar aporte do mês',
        descricao: 'Ainda não há entrada no mês atual. Registrar aporte ajuda na disciplina do plano.',
        cta: 'Nova posição',
        openForm: true
      };
    }

    if (this.metaPatrimonio > 0 && this.progressoMeta < 100) {
      return {
        titulo: 'Ajustar plano da meta',
        descricao: `Faltam ${this.currencyFormatter.format(this.faltaMeta)} para atingir sua meta de patrimônio.`,
        cta: 'Ver evolução',
        targetId: 'sec-evolucao'
      };
    }

    return {
      titulo: 'Carteira em rotina estável',
      descricao: 'Com os dados atuais, siga acompanhando rentabilidade e proventos.',
      cta: 'Ver evolução',
      targetId: 'sec-evolucao'
    };
  }

  get distribuicaoPorTipo(): { key: InvestmentType; label: string; value: number; percent: number }[] {
    const total = this.filteredPositions.reduce((sum, p) => sum + this.positionCurrentValue(p), 0);
    return this.tipos
      .map((tipo) => {
        const value = this.filteredPositions.filter((p) => p.type === tipo.value).reduce((sum, p) => sum + this.positionCurrentValue(p), 0);
        return { key: tipo.value, label: tipo.label, value, percent: total > 0 ? (value / total) * 100 : 0 };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  get distribuicaoPorTipoComCor(): { key: InvestmentType; label: string; value: number; percent: number; color: string }[] {
    const palette: Record<InvestmentType, string> = { RF: '#2563eb', ACOES: '#7c3aed', FUNDOS: '#0891b2', CRIPTO: '#ea580c' };
    return this.distribuicaoPorTipo.map((item) => ({ ...item, color: palette[item.key] }));
  }

  get distribuicaoConicGradient(): string {
    const parts: string[] = [];
    let cursor = 0;
    for (const item of this.distribuicaoPorTipoComCor) {
      const next = cursor + item.percent;
      parts.push(`${item.color} ${cursor}% ${next}%`);
      cursor = next;
    }
    return parts.length ? `conic-gradient(${parts.join(', ')})` : 'conic-gradient(#cbd5e1 0 100%)';
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

  get evolucaoMaxValor(): number {
    return this.evolucaoMensalSeries.reduce((max, item) => Math.max(max, item.aporte, item.resgate, item.proventos), 0) || 1;
  }

  get proventosPorAtivo(): { asset: string; total: number }[] {
    const totals = new Map<string, number>();
    for (const pos of this.positions) {
      for (const mov of pos.movements || []) {
        if (!['DIVIDENDO', 'JCP', 'RENDIMENTO'].includes(mov.type)) continue;
        const value = (mov.quantity || 0) * (mov.price || 0);
        totals.set(pos.asset, (totals.get(pos.asset) || 0) + value);
      }
    }
    return Array.from(totals.entries()).map(([asset, total]) => ({ asset, total })).sort((a, b) => b.total - a.total).slice(0, 6);
  }

  get proventosTotal(): number {
    return this.proventosPorAtivo.reduce((sum, item) => sum + item.total, 0);
  }

  get aporteTotal(): number {
    return this.positions.reduce((sum, pos) => sum + this.positionNetContributed(pos), 0);
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

  get mesesComparativo(): number {
    return Math.max(this.evolucaoMensalSeries.length, 1);
  }

  get alvoAlocacao(): { key: InvestmentType; label: string; alvo: number; atual: number; desvio: number; alerta: boolean }[] {
    const target: Record<InvestmentType, number> = { RF: 40, ACOES: 35, FUNDOS: 20, CRIPTO: 5 };
    const atualMap = new Map(this.distribuicaoPorTipo.map((i) => [i.key, i.percent]));
    return this.tipos.map((t) => {
      const atual = atualMap.get(t.value) || 0;
      const desvio = atual - target[t.value];
      return { key: t.value, label: t.label, alvo: target[t.value], atual, desvio, alerta: Math.abs(desvio) >= 7 };
    });
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
      this.setActiveTab('LANCAMENTOS');
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
    return this.positionCurrentValue(pos);
  }

  resultadoPosicao(pos: InvestmentPosition): number {
    return this.positionCurrentValue(pos) - this.positionNetContributed(pos);
  }

  resultadoPosicaoPercentual(pos: InvestmentPosition): number {
    const base = this.positionNetContributed(pos);
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
      const created = await firstValueFrom(this.investments.createPosition(payload));
      await firstValueFrom(
        this.investments.addMovement(created.id, {
          type: 'COMPRA',
          quantity: this.novaPosicao.quantity,
          price: this.novaPosicao.avgPrice,
          date: payload.openedAt,
          note: custos > 0
            ? `Cadastro inicial da posição (custos: ${this.currencyFormatter.format(custos)})`
            : 'Cadastro inicial da posição'
        })
      );
      this.resetPosicao();
      this.showCadastro = false;
      this.carregarPosicoes();
      this.uiFeedback.success('Posição cadastrada com compra inicial registrada.');
    } catch (err: any) {
      this.uiFeedback.error(err?.error?.detail || 'Falha ao cadastrar posição.');
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
    } catch (err: any) {
      this.uiFeedback.error(err?.error?.detail || 'Falha ao registrar venda.');
    }
  }

  abrirMovimento(pos: InvestmentPosition): void {
    this.selectedId = pos.id;
    this.posSelecionada = pos;
    this.mode = 'movement';
    this.showMovimento = true;
    this.movimento = { type: 'COMPRA', quantity: 0, price: pos.avgPrice, date: new Date().toISOString().slice(0, 10), note: '' };
    this.movimentoCustos = 0;
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
      error: (err) => this.uiFeedback.error(err?.error?.detail || 'Falha ao registrar movimento.')
    });
  }

  resetPosicao(): void {
    this.novaPosicao = {
      type: 'RF', asset: '', quantity: 0, avgPrice: 0,
      openedAt: new Date().toISOString().slice(0, 10), account: '', category: ''
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
      error: (err) => (this.b3Error = err?.error?.detail || 'Não foi possível ler o relatório da B3.'),
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
      error: (err) => (this.b3Error = err?.error?.detail || 'Falha ao importar dados da B3.'),
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
      const rows = this.parseCsvRows(text);
      if (!rows.length) throw new Error('CSV vazio ou inválido.');

      this.csvPreviewRows = rows.slice(0, 10);
      for (const row of rows) {
        await firstValueFrom(this.investments.createPosition(row));
        this.csvImported++;
      }

      this.uiFeedback.success(`Importação CSV concluída: ${this.csvImported} posição(ões).`);
      this.carregarPosicoes();
    } catch (err: any) {
      this.csvError = err?.error?.detail || err?.message || 'Falha ao importar CSV.';
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
    this.investments.getGoal().subscribe({
      next: (goal) => {
        if (!goal) return;
        this.metaPatrimonio = goal.targetAmount || 0;
        this.metaPatrimonioInput = this.metaPatrimonio ? formatNumberValue(this.metaPatrimonio) : '';
      }
    });
  }

  private carregarPosicoes(): void {
    this.investments.listPositions().subscribe({
      next: (list) => {
        this.positions = list;
      }
    });
  }

  private parseValor(raw: string): number {
    return parseLocalizedNumber(raw);
  }

  private parseCsvRows(text: string): InvestmentPositionRequest[] {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map((h) => this.normalize(h));
    const idx = (name: string) => headers.indexOf(this.normalize(name));

    const typeI = idx('type');
    const assetI = idx('asset');
    const qtyI = idx('quantity');
    const avgI = idx('avgprice');
    const openedI = idx('openedat');
    const accountI = idx('account');
    const categoryI = idx('category');
    const noteI = idx('note');

    if ([typeI, assetI, qtyI, avgI, openedI, accountI].some((i) => i < 0)) {
      throw new Error('Cabeçalho CSV inválido. Esperado: type,asset,quantity,avgPrice,openedAt,account,category,note');
    }

    const validTypes = new Set<InvestmentType>(['RF', 'ACOES', 'FUNDOS', 'CRIPTO']);
    return lines.slice(1).map((line) => {
      const cols = line.split(delimiter).map((c) => c.trim());
      const type = (cols[typeI] || '').toUpperCase() as InvestmentType;
      if (!validTypes.has(type)) throw new Error(`Tipo inválido no CSV: ${cols[typeI]}`);

      const quantity = parseLocalizedNumber(cols[qtyI] || '0');
      const avgPrice = parseLocalizedNumber(cols[avgI] || '0');
      if (!quantity || !avgPrice) throw new Error(`Quantidade/preço inválidos para ativo ${cols[assetI]}`);

      return {
        type,
        asset: cols[assetI],
        quantity,
        avgPrice,
        openedAt: cols[openedI],
        account: cols[accountI],
        category: cols[categoryI] || '',
        note: noteI >= 0 ? cols[noteI] || null : null
      };
    });
  }

  private positionCurrentValue(pos: InvestmentPosition): number {
    return (pos.quantity || 0) * (pos.avgPrice || 0);
  }

  private positionNetContributed(pos: InvestmentPosition): number {
    const initial = this.positionCurrentValue(pos);
    if (!pos.movements?.length) return initial;
    return pos.movements.reduce((acc, mov) => {
      const value = (mov.quantity || 0) * (mov.price || 0);
      if (mov.type === 'RESGATE' || mov.type === 'VENDA') return acc - value;
      if (mov.type === 'DIVIDENDO' || mov.type === 'JCP' || mov.type === 'RENDIMENTO') return acc;
      return acc + value;
    }, 0);
  }

  private isCurrentMonth(iso: string): boolean {
    if (!iso) return false;
    const [year, month] = iso.split('T')[0].split('-').map(Number);
    const now = new Date();
    return !!year && !!month && year === now.getFullYear() && month === now.getMonth() + 1;
  }

  private normalize(value: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
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
      this.setActiveTab('POSICOES');
    }
  }

  private restoreTab(): void {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(this.tabStorageKey);
    const valid = new Set(this.tabs.map((t) => t.key));
    if (raw && valid.has(raw as InvestmentsTab)) {
      this.activeTab = raw as InvestmentsTab;
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
