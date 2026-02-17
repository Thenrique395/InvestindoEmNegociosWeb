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

type FormMode = 'create' | 'movement';
type ChartBucket = { key: string; label: string; aporte: number; resgate: number; proventos: number; saldo: number };

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, CurrencyPipe, DigitOnlyDirective],
  templateUrl: './investments.component.html',
  styleUrls: ['./investments.component.scss']
})
export class InvestmentsComponent implements OnInit {
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
      next: (items) => {
        this.institutions = items || [];
      },
      error: () => {
        this.institutions = [];
      }
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
          .filter((mov) => mov.type === 'APORTE')
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
          .filter((mov) => mov.type === 'RESGATE')
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
    for (const pos of this.positions) {
      if (pos.account?.trim()) set.add(pos.account.trim());
    }
    for (const inst of this.institutions) {
      if (inst.name?.trim()) set.add(inst.name.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  get filteredPositions(): InvestmentPosition[] {
    const text = this.normalize(this.searchTerm);
    return this.positions.filter((p) => {
      const typeOk = this.filterType === 'ALL' || p.type === this.filterType;
      const accountOk = this.filterAccount === 'ALL' || (p.account || '').trim() === this.filterAccount;
      const statusOk =
        this.filterStatus === 'ALL' ||
        (this.filterStatus === 'ACTIVE' ? p.quantity > 0 : p.quantity <= 0);
      const textOk =
        !text ||
        this.normalize(p.asset).includes(text) ||
        this.normalize(p.account || '').includes(text) ||
        this.normalize(p.category || '').includes(text);

      return typeOk && accountOk && statusOk && textOk;
    });
  }

  get distribuicaoPorTipo(): { key: InvestmentType; label: string; value: number; percent: number }[] {
    const total = this.filteredPositions.reduce((sum, p) => sum + this.positionCurrentValue(p), 0);
    return this.tipos
      .map((tipo) => {
        const value = this.filteredPositions
          .filter((p) => p.type === tipo.value)
          .reduce((sum, p) => sum + this.positionCurrentValue(p), 0);
        return {
          key: tipo.value,
          label: tipo.label,
          value,
          percent: total > 0 ? (value / total) * 100 : 0
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  get distribuicaoPorTipoComCor(): { key: InvestmentType; label: string; value: number; percent: number; color: string }[] {
    const palette: Record<InvestmentType, string> = {
      RF: '#2563eb',
      ACOES: '#7c3aed',
      FUNDOS: '#0891b2',
      CRIPTO: '#ea580c'
    };
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
    if (!parts.length) {
      return 'conic-gradient(#cbd5e1 0 100%)';
    }
    return `conic-gradient(${parts.join(', ')})`;
  }

  get evolucaoMensalSeries(): ChartBucket[] {
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      months.push({ key, label });
    }

    const map = new Map<string, ChartBucket>(
      months.map((m) => [m.key, { key: m.key, label: m.label, aporte: 0, resgate: 0, proventos: 0, saldo: 0 }])
    );

    for (const pos of this.positions) {
      for (const mov of pos.movements || []) {
        if (!mov?.date) continue;
        const [y, m] = mov.date.split('T')[0].split('-');
        const key = `${y}-${m}`;
        const bucket = map.get(key);
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
    return Array.from(totals.entries())
      .map(([asset, total]) => ({ asset, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }

  get proventosTotal(): number {
    return this.proventosPorAtivo.reduce((sum, item) => sum + item.total, 0);
  }

  get aporteTotal(): number {
    return this.positions.reduce((sum, pos) => {
      return sum + this.positionNetContributed(pos);
    }, 0);
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

  valorAtualPosicao(pos: InvestmentPosition): number {
    return this.positionCurrentValue(pos);
  }

  resultadoPosicao(pos: InvestmentPosition): number {
    return this.positionCurrentValue(pos) - this.positionNetContributed(pos);
  }

  resultadoPosicaoPercentual(pos: InvestmentPosition): number {
    const base = this.positionNetContributed(pos);
    if (!base) return 0;
    return (this.resultadoPosicao(pos) / base) * 100;
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
      error: () => {
        this.metaSalvando = false;
      }
    });
  }

  salvarPosicao(): void {
    if (!this.novaPosicao.asset || this.novaPosicao.quantity <= 0 || this.novaPosicao.avgPrice <= 0) {
      return;
    }
    const payload: InvestmentPositionRequest = {
      ...this.novaPosicao,
      category: this.novaPosicao.category || ''
    };
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
    this.movimento = {
      type: 'APORTE',
      quantity: 0,
      price: pos.avgPrice,
      date: new Date().toISOString().slice(0, 10),
      note: ''
    };
  }

  salvarMovimento(): void {
    if (!this.selectedId) return;
    if (this.movimento.quantity <= 0 || this.movimento.price <= 0) return;
    this.investments.addMovement(this.selectedId, this.movimento).subscribe({
      next: () => {
        this.mode = 'create';
        this.selectedId = null;
        this.posSelecionada = null;
        this.showMovimento = false;
        this.carregarPosicoes();
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || 'Falha ao registrar movimento.');
      }
    });
  }

  resetPosicao(): void {
    this.novaPosicao = {
      type: 'RF',
      asset: '',
      quantity: 0,
      avgPrice: 0,
      openedAt: new Date().toISOString().slice(0, 10),
      account: '',
      category: ''
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
      next: (preview) => {
        this.b3Preview = preview;
      },
      error: (err) => {
        this.b3Error = err?.error?.detail || 'Não foi possível ler o relatório da B3.';
      },
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
      error: (err) => {
        this.b3Error = err?.error?.detail || 'Falha ao importar dados da B3.';
      },
      complete: () => {
        this.b3Importing = false;
      }
    });
  }

  private carregarMeta(): void {
    this.investments.getGoal().subscribe({
      next: (goal) => {
        if (!goal) return;
        this.metaPatrimonio = goal.targetAmount || 0;
        if (this.metaPatrimonio) {
          this.metaPatrimonioInput = formatNumberValue(this.metaPatrimonio);
        }
      }
    });
  }

  private carregarPosicoes(): void {
    this.investments.listPositions().subscribe({
      next: (list) => (this.positions = list)
    });
  }

  private parseValor(raw: string): number {
    return parseLocalizedNumber(raw);
  }

  private positionCurrentValue(pos: InvestmentPosition): number {
    return (pos.quantity || 0) * (pos.avgPrice || 0);
  }

  private positionNetContributed(pos: InvestmentPosition): number {
    const initial = this.positionCurrentValue(pos);
    if (!pos.movements?.length) return initial;
    return pos.movements.reduce((acc, mov) => {
      const value = (mov.quantity || 0) * (mov.price || 0);
      if (mov.type === 'RESGATE' || mov.type === 'VENDA') {
        return acc - value;
      }
      if (mov.type === 'DIVIDENDO' || mov.type === 'JCP' || mov.type === 'RENDIMENTO') {
        return acc;
      }
      return acc + value;
    }, 0);
  }

  private isCurrentMonth(iso: string): boolean {
    if (!iso) return false;
    const [year, month] = iso.split('T')[0].split('-').map(Number);
    if (!year || !month) return false;
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
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
