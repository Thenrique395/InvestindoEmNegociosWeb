import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, DecimalPipe, NgClass, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { StoredExpense } from '../data/api-data.service';

@Component({
  selector: 'app-despesas-lista',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe, NgClass, NgSwitch, NgSwitchCase, NgSwitchDefault],
  templateUrl: './despesas-lista.component.html',
  styleUrls: ['./despesas-lista.component.scss']
})
export class DespesasListaComponent {
  @Input() despesas: StoredExpense[] = [];
  @Input() sortBy: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | null = null;
  @Input() sortDir: 1 | -1 = 1;
  @Input() pagamentoLabelFn?: (d: StoredExpense) => string;
  @Input() cardLabelFn?: (id?: string) => string;
   @Input() selectedIds: string[] = [];

  @Output() ordenar = new EventEmitter<'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor'>();
  @Output() editar = new EventEmitter<string>();
  @Output() remover = new EventEmitter<string>();
  @Output() pagar = new EventEmitter<string>();
  @Output() selecionar = new EventEmitter<{ id: string; checked: boolean }>();
  @Output() selecionarTodos = new EventEmitter<boolean>();

  ordenarPor(campo: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor'): void {
    this.ordenar.emit(campo);
  }

  pagamentoLabel(d: StoredExpense): string {
    return this.pagamentoLabelFn ? this.pagamentoLabelFn(d) : d.cartao ? 'Cartão' : 'À vista';
  }

  cardLabel(id?: string): string {
    return this.cardLabelFn ? this.cardLabelFn(id) : id || '';
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'PAID':
        return 'Pago';
      case 'PARTIALLY_PAID':
        return 'Parcial';
      case 'CANCELED':
        return 'Cancelado';
      case 'OPEN':
      default:
        return 'Pendente';
    }
  }

  isSelecionado(id?: string): boolean {
    if (!id) return false;
    return this.selectedIds.includes(id);
  }
}
