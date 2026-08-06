import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvestmentPosition, InvestmentType, MovementType } from '../../../investments.service';
import { InstitutionLookup } from '../../../lookups.service';
import { AppCurrencyPipe } from '../../../shared/app-currency.pipe';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { DatePickerComponent } from '../../../shared/date-picker/date-picker.component';

export type InvestmentLaunchOperation = 'COMPRA' | 'VENDA';
export type InvestmentSaleForm = { quantity: number; price: number; date: string; note?: string };
export type InvestmentMovementForm = { type: MovementType; quantity: number; price: number; date: string; note?: string };
export type InvestmentPositionDraft = Omit<InvestmentPosition, 'id' | 'movements'>;

@Component({
  selector: 'app-investment-launch-modals',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, AppCurrencyPipe, ModalComponent, DatePickerComponent],
  templateUrl: './investment-launch-modals.component.html',
  styleUrl: './investment-launch-modals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvestmentLaunchModalsComponent {
  @Input() showCadastro = false;
  @Input() cadastroOperacao: InvestmentLaunchOperation = 'COMPRA';
  @Input() novaPosicao!: InvestmentPositionDraft;
  @Input() tipos: { value: InvestmentType; label: string }[] = [];
  @Input() currencyOptions: readonly string[] = [];
  @Input() institutions: InstitutionLookup[] = [];
  @Input() cadastroCustos = 0;
  @Input() posicoesVendaveis: InvestmentPosition[] = [];
  @Input() vendaPositionId = '';
  @Input() venda!: InvestmentSaleForm;
  @Input() cadastroValorTotal = 0;
  @Input() vendaValorTotal = 0;

  @Input() showMovimento = false;
  @Input() posSelecionada?: InvestmentPosition | null;
  @Input() movimento!: InvestmentMovementForm;
  @Input() movimentoTipos: { value: MovementType; label: string }[] = [];
  @Input() movimentoCustos = 0;
  @Input() movimentoValorTotal = 0;

  @Output() closeCadastro = new EventEmitter<void>();
  @Output() setCadastroOperacao = new EventEmitter<InvestmentLaunchOperation>();
  @Output() cadastroCustosChange = new EventEmitter<number>();
  @Output() vendaPositionSelected = new EventEmitter<string>();
  @Output() savePosition = new EventEmitter<void>();
  @Output() saveSale = new EventEmitter<void>();
  @Output() closeMovimento = new EventEmitter<void>();
  @Output() movimentoCustosChange = new EventEmitter<number>();
  @Output() saveMovement = new EventEmitter<void>();

  trackByIndex(index: number): number {
    return index;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
