import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { StoredIncome } from '../data/api-data.service';
import { incomeStatusLabel } from '../utils/status';

@Component({
  selector: 'app-receitas-lista',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe],
  templateUrl: './receitas-lista.component.html',
  styleUrls: ['./receitas-lista.component.scss']
})
export class ReceitasListaComponent {
  @Input() rendas: StoredIncome[] = [];
  @Input() showStatus = false;
  @Input() selectedIds: string[] = [];
  @Output() editar = new EventEmitter<string>();
  @Output() remover = new EventEmitter<{ planId?: string; installmentId: string }>();
  @Output() selecionar = new EventEmitter<{ id: string; checked: boolean }>();
  @Output() selecionarTodos = new EventEmitter<boolean>();

  onEditar(id: string): void {
    this.editar.emit(id);
  }

  onRemover(planId?: string, installmentId?: string): void {
    if (!installmentId) return;
    this.remover.emit({ planId, installmentId });
  }

  statusLabel(renda: StoredIncome): string {
    return incomeStatusLabel(renda.status);
  }

  isSelecionado(id?: string): boolean {
    if (!id) return false;
    return this.selectedIds.includes(id);
  }
}
