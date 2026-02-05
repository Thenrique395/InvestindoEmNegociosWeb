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

  get aporteTotal(): number {
    return this.positions.reduce((sum, pos) => {
      const inicial = pos.quantity * pos.avgPrice;
      const movimentos = pos.movements.reduce((acc, mov) => {
        const valor = mov.quantity * mov.price;
        return mov.type === 'RESGATE' ? acc - valor : acc + valor;
      }, 0);
      return sum + (movimentos || inicial);
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
}
