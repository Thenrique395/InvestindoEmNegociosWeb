import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  InvestmentsService,
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
  posSelecionada?: InvestmentPosition | null;
  metaPatrimonioInput = '';
  metaPatrimonio = 0;
  metaSalvando = false;

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
      return mov.type === 'RESGATE' ? acc - value : acc + value;
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
