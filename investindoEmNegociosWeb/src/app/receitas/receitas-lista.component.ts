import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { StoredIncome } from '../data/api-data.service';

@Component({
  selector: 'app-receitas-lista',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  templateUrl: './receitas-lista.component.html',
  styleUrls: ['./receitas-lista.component.scss']
})
export class ReceitasListaComponent {
  @Input() rendas: StoredIncome[] = [];
  @Output() editar = new EventEmitter<string>();
  @Output() remover = new EventEmitter<{ planId?: string; installmentId: string }>();

  onEditar(id: string): void {
    this.editar.emit(id);
  }

  onRemover(planId?: string, installmentId?: string): void {
    if (!installmentId) return;
    this.remover.emit({ planId, installmentId });
  }
}
