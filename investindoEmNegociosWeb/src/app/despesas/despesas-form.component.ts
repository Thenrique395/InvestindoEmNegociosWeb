import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { StoredCard, StoredExpense } from '../data/local-db.service';

@Component({
  selector: 'app-despesas-form',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './despesas-form.component.html',
  styleUrls: ['./despesas-form.component.scss']
})
export class DespesasFormComponent {
  @Input() mostrarForm = false;
  @Input() categorias: string[] = [];
  @Input() cartoes: StoredCard[] = [];
  @Input() novaDespesa!: StoredExpense;
  @Input() valorInput = '';
  @Input() valorParcelaLabel = '';
  @Input() vencimentoInput = '';
  @Input() erroData = '';
  @Input() formaPagamento: 'avista' | 'cartao' = 'avista';
  @Input() parcelar = false;
  @Input() parcelasCount = 1;
  @Input() cartaoSelecionadoId: string | null = null;
  @Input() cartaoSelecionadoLabel = '';

  @Output() valorChange = new EventEmitter<string>();
  @Output() vencimentoChange = new EventEmitter<string>();
  @Output() formaPagamentoChange = new EventEmitter<'avista' | 'cartao'>();
  @Output() parcelarChange = new EventEmitter<boolean>();
  @Output() parcelasChange = new EventEmitter<number>();
  @Output() cartaoChange = new EventEmitter<string | null>();
  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onValorChange(value: string): void {
    this.valorChange.emit(value);
  }

  onVencimentoChange(value: string): void {
    this.vencimentoChange.emit(value);
  }

  onFormaPagamentoChange(value: 'avista' | 'cartao'): void {
    this.formaPagamentoChange.emit(value);
  }

  onParcelarToggle(value: boolean): void {
    this.parcelarChange.emit(value);
  }

  onParcelasChange(value: number): void {
    this.parcelasChange.emit(value);
  }

  onCartaoChange(value: string | null): void {
    this.cartaoChange.emit(value);
  }

  salvar(): void {
    this.submitForm.emit();
  }

  fechar(): void {
    this.cancel.emit();
  }
}
