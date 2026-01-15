import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvestmentsService, InvestmentPosition, InvestmentType, MovementType } from '../investments.service';

type FormMode = 'create' | 'movement';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investments.component.html',
  styleUrls: ['./investments.component.scss']
})
export class InvestmentsComponent {
  positions: InvestmentPosition[] = [];
  mode: FormMode = 'create';
  selectedId: string | null = null;
  showCadastro = false;
  showMovimento = false;
  posSelecionada?: InvestmentPosition | null;

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

  constructor(private investments: InvestmentsService) {
    this.investments.positions$.subscribe((list) => (this.positions = list));
  }

  salvarPosicao(): void {
    if (!this.novaPosicao.asset || this.novaPosicao.quantity <= 0 || this.novaPosicao.avgPrice <= 0) {
      return;
    }
    this.investments.addPosition(this.novaPosicao);
    this.resetPosicao();
    this.showCadastro = false;
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
    try {
      this.investments.addMovement(this.selectedId, this.movimento);
      this.mode = 'create';
      this.selectedId = null;
      this.posSelecionada = null;
      this.showMovimento = false;
    } catch (e) {
      alert((e as Error).message);
    }
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
}
