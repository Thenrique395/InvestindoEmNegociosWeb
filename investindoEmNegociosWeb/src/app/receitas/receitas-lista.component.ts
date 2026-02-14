import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { StoredIncome } from '../data/api-data.service';
import { incomeStatusLabel } from '../utils/status';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-receitas-lista',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe, StatusBadgeComponent, EmptyStateComponent],
  templateUrl: './receitas-lista.component.html',
  styleUrls: ['./receitas-lista.component.scss']
})
export class ReceitasListaComponent {
  @Input() rendas: StoredIncome[] = [];
  @Input() showStatus = false;
  @Input() emptyTitle = 'Sem receitas neste período';
  @Input() emptyDescription = 'Cadastre sua primeira receita para iniciar o acompanhamento.';
  @Input() emptyCtaLabel = 'Adicionar receita';
  @Input() sortBy: 'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status' | null = null;
  @Input() sortDir: 1 | -1 = 1;
  @Input() selectedIds: string[] = [];
  @Output() editar = new EventEmitter<string>();
  @Output() remover = new EventEmitter<{ planId?: string; installmentId: string }>();
  @Output() selecionar = new EventEmitter<{ id: string; checked: boolean }>();
  @Output() selecionarTodos = new EventEmitter<boolean>();
  @Output() ordenar = new EventEmitter<'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status'>();
  @Output() emptyAction = new EventEmitter<void>();

  ordenarPor(campo: 'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status'): void {
    this.ordenar.emit(campo);
  }

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
