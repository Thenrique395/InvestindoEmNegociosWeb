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
import { DigitOnlyDirective } from '../utils/digit-only.directive';
import { formatNumberValue, parseLocalizedNumber } from '../utils/locale-utils';
import { UiFeedbackService } from '../ui-feedback.service';
import { firstValueFrom } from 'rxjs';

type FormMode = 'create' | 'movement';
type ChartBucket = { key: string; label: string; aporte: number; resgate: number; proventos: number; saldo: number };
type BenchmarkPoint = { name: string; carteira: number; benchmark: number };

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, CurrencyPipe, DigitOnlyDirective],
  templateUrl: './investments.component.html',
  styleUrls: ['./investments.component.scss']
})
export class InvestmentsComponent implements OnInit {
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

  // Prioridade 7: simulador, agenda, fiscal e CSV
  csvLoading = false;
  csvError = '';
  csvImported = 0;
  csvPreviewRows: InvestmentPositionRequest[] = [];
  simuladorAporteMensal = 1000;
  simuladorHorizonteMeses = 120;
  metaMensalPlanejada = 1000;
  metaDay = 5;
  fiscalAnoSelecionado = new Date().getFullYear();

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
    type: 'APORTE',
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

  constructor(private investments: InvestmentsService, private lookups: LookupsService, private uiFeedback: UiFeedbackService) {}

  ngOnInit(): void {
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

  get benchmarkComparativo(): BenchmarkPoint[] {
    const months = Math.max(this.evolucaoMensalSeries.length, 1);
    const carteira = this.rentabilidadeAcumuladaPercent;
    const annual: Record<string, number> = { CDI: 12.2, IPCA: 4.5, Ibovespa: 11.3, 'S&P500': 13.8 };
    return Object.entries(annual).map(([name, yearly]) => {
      const monthly = Math.pow(1 + yearly / 100, 1 / 12) - 1;
      const bench = (Math.pow(1 + monthly, months) - 1) * 100;
      return { name, carteira, benchmark: bench };
    });
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

  get eventosAgenda(): { date: string; tipo: string; descricao: string }[] {
    const events: { date: string; tipo: string; descricao: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, this.metaDay);
      events.push({
        date: d.toISOString().slice(0, 10),
        tipo: 'Aporte planejado',
        descricao: `Aporte mensal de ${this.currencyFormatter.format(this.metaMensalPlanejada || this.simuladorAporteMensal)}`
      });
    }

    for (const p of this.positions) {
      const match = /\b(20\d{2})\b/.exec(p.asset || '');
      if (!match) continue;
      const year = Number(match[1]);
      if (!year || year < today.getFullYear()) continue;
      events.push({ date: `${year}-12-31`, tipo: 'Vencimento', descricao: `${p.asset} (${p.account || 'Conta'})` });
    }

    return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }

  get prazoMetaMeses(): number | null {
    if (!this.metaPatrimonio || this.patrimonioAtual >= this.metaPatrimonio) return 0;
    const mediaFluxo = this.evolucaoMensalSeries.reduce((acc, m) => acc + m.saldo, 0) / Math.max(this.evolucaoMensalSeries.length, 1);
    const aporteMensal = this.metaMensalPlanejada || mediaFluxo;
    if (aporteMensal <= 0) return null;
    return Math.ceil((this.metaPatrimonio - this.patrimonioAtual) / aporteMensal);
  }

  get prazoMetaDataEstimada(): string | null {
    if (this.prazoMetaMeses === null) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + this.prazoMetaMeses);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  get retornoTotalRenda(): number {
    return this.proventosTotal;
  }

  get retornoTotalPreco(): number {
    return this.crescimentoEstimado - this.proventosTotal;
  }

  get retornoTotalGeral(): number {
    return this.crescimentoEstimado;
  }

  get simuladorCenarios(): { nome: string; taxaMensal: number; valorFinal: number }[] {
    const initial = this.patrimonioAtual;
    const aporte = this.simuladorAporteMensal || 0;
    const meses = this.simuladorHorizonteMeses || 0;
    const scenarios = [
      { nome: 'Conservador', taxaMensal: 0.004 },
      { nome: 'Base', taxaMensal: 0.008 },
      { nome: 'Otimista', taxaMensal: 0.012 }
    ];
    return scenarios.map((s) => {
      let total = initial;
      for (let i = 0; i < meses; i++) total = (total + aporte) * (1 + s.taxaMensal);
      return { ...s, valorFinal: total };
    });
  }

  get anosFiscaisDisponiveis(): number[] {
    const years = new Set<number>([new Date().getFullYear()]);
    for (const pos of this.positions) {
      for (const mov of pos.movements || []) {
        const year = Number(mov.date?.slice(0, 4));
        if (year) years.add(year);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }

  get resumoFiscal(): { compras: number; vendas: number; proventos: number; taxas: number; saldo: number } {
    let compras = 0;
    let vendas = 0;
    let proventos = 0;
    let taxas = 0;
    for (const pos of this.positions) {
      for (const mov of pos.movements || []) {
        const year = Number(mov.date?.slice(0, 4));
        if (year !== this.fiscalAnoSelecionado) continue;
        const value = (mov.quantity || 0) * (mov.price || 0);
        if (mov.type === 'COMPRA' || mov.type === 'APORTE') compras += value;
        else if (mov.type === 'VENDA' || mov.type === 'RESGATE') vendas += value;
        else if (mov.type === 'DIVIDENDO' || mov.type === 'JCP' || mov.type === 'RENDIMENTO') proventos += value;
        else if (mov.type === 'TAXA') taxas += value;
      }
    }
    return { compras, vendas, proventos, taxas, saldo: vendas + proventos - compras - taxas };
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

  salvarPosicao(): void {
    if (!this.novaPosicao.asset || this.novaPosicao.quantity <= 0 || this.novaPosicao.avgPrice <= 0) return;
    const payload: InvestmentPositionRequest = { ...this.novaPosicao, category: this.novaPosicao.category || '' };
    this.investments.createPosition(payload).subscribe({
      next: () => {
        this.resetPosicao();
        this.showCadastro = false;
        this.carregarPosicoes();
      }
    });
  }

  abrirMovimento(pos: InvestmentPosition): void {
    this.selectedId = pos.id;
    this.posSelecionada = pos;
    this.mode = 'movement';
    this.showMovimento = true;
    this.movimento = { type: 'APORTE', quantity: 0, price: pos.avgPrice, date: new Date().toISOString().slice(0, 10), note: '' };
  }

  salvarMovimento(): void {
    if (!this.selectedId || this.movimento.quantity <= 0 || this.movimento.price <= 0) return;
    this.investments.addMovement(this.selectedId, this.movimento).subscribe({
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
  }

  closeCadastroModal(): void {
    this.showCadastro = false;
    this.resetPosicao();
  }

  closeMovimentoModal(): void {
    this.showMovimento = false;
    this.posSelecionada = null;
    this.selectedId = null;
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
    this.investments.listPositions().subscribe({ next: (list) => (this.positions = list) });
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

  trackByIndex(index: number): number {
    return index;
  }
}
