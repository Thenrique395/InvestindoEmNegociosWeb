import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { StoredExpense } from '../data/api-data.service';

@Component({
  selector: 'app-despesas-lista',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  templateUrl: './despesas-lista.component.html',
  styleUrls: ['./despesas-lista.component.scss']
})
export class DespesasListaComponent {
  @Input() despesas: StoredExpense[] = [];
  @Input() sortBy: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | null = null;
  @Input() sortDir: 1 | -1 = 1;
  @Input() pagamentoLabelFn?: (d: StoredExpense) => string;
  @Input() cardLabelFn?: (id?: string) => string;

  @Output() ordenar = new EventEmitter<'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor'>();
  @Output() editar = new EventEmitter<string>();
  @Output() remover = new EventEmitter<string>();

  ordenarPor(campo: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor'): void {
    this.ordenar.emit(campo);
  }

  pagamentoLabel(d: StoredExpense): string {
    return this.pagamentoLabelFn ? this.pagamentoLabelFn(d) : d.cartao ? 'Cartão' : 'À vista';
  }

  cardLabel(id?: string): string {
    return this.cardLabelFn ? this.cardLabelFn(id) : id || '';
  }
}
