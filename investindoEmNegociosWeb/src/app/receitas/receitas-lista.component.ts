import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StoredIncome } from '../data/api-data.service';
import { incomeStatusLabel, installmentStatusTone } from '../utils/status';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { ResponsiveListComponent, ResponsiveListColumn } from '../shared/responsive-list/responsive-list.component';
import { ResponsiveListCellDirective } from '../shared/responsive-list/responsive-list-cell.directive';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';

@Component({
  selector: 'app-receitas-lista',
  standalone: true,
  imports: [StatusBadgeComponent, ResponsiveListComponent, ResponsiveListCellDirective, AppCurrencyPipe],
  templateUrl: './receitas-lista.component.html',
  styleUrls: ['./receitas-lista.component.scss']
})
export class ReceitasListaComponent {
  @Input() rendas: StoredIncome[] = [];
  @Input() loading = false;
  @Input() showStatus = false;
  @Input() emptyTitle = 'Sem receitas neste período';
  @Input() emptyDescription = 'Cadastre sua primeira receita para iniciar o acompanhamento.';
  @Input() emptyCtaLabel = 'Adicionar receita';
  @Input() sortBy: 'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status' | null = null;
  @Input() sortDir: 1 | -1 = 1;
  @Input() selectedIds: string[] = [];
  @Input() attachingReceiptIds: Set<string> = new Set();
  @Output() editar = new EventEmitter<string>();
  @Output() remover = new EventEmitter<{ planId?: string; installmentId: string }>();
  @Output() comprovante = new EventEmitter<string>();
  @Output() selecionar = new EventEmitter<{ id: string; checked: boolean }>();
  @Output() selecionarTodos = new EventEmitter<boolean>();
  @Output() ordenar = new EventEmitter<'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status'>();
  @Output() emptyAction = new EventEmitter<void>();

  get columns(): ResponsiveListColumn[] {
    const base: ResponsiveListColumn[] = [
      { key: 'fonte', label: 'Fonte', sortable: true },
      { key: 'categoria', label: 'Categoria', sortable: true },
      { key: 'valor', label: 'Valor', sortable: true, align: 'end' },
      { key: 'recebimento', label: 'Recebimento', sortable: true },
      { key: 'tipo', label: 'Tipo', sortable: true }
    ];
    if (this.showStatus) {
      base.push({ key: 'status', label: 'Status', sortable: true });
    }
    base.push({ key: 'acoes', label: 'Ações', align: 'end' });
    return base;
  }

  ordenarPor(campo: 'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status'): void {
    this.ordenar.emit(campo);
  }

  onSort(column: string): void {
    this.ordenarPor(column as 'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status');
  }

  onEditar(id: string): void {
    this.editar.emit(id);
  }

  onRemover(planId?: string, installmentId?: string): void {
    if (!installmentId) return;
    this.remover.emit({ planId, installmentId });
  }

  onComprovante(id?: string): void {
    if (!id) return;
    this.comprovante.emit(id);
  }

  isAttachingReceipt(id?: string): boolean {
    return !!id && this.attachingReceiptIds.has(id);
  }

  canAttachReceipt(renda: StoredIncome): boolean {
    return renda.status === 'PAID' || renda.status === 'PARTIALLY_PAID';
  }

  statusLabel(renda: StoredIncome): string {
    return incomeStatusLabel(renda.status);
  }

  statusTone(renda: StoredIncome) {
    return installmentStatusTone(renda.status);
  }

  isSelecionavel(renda: StoredIncome): boolean {
    return renda.status !== 'PAID' && renda.status !== 'CANCELED';
  }

  get selectableIds(): string[] {
    return this.rendas.filter((r) => this.isSelecionavel(r) && r.id).map((r) => r.id!);
  }

  getId = (r: StoredIncome): string => r.id || '';

  onSelectionChange(event: { id: string; checked: boolean }): void {
    this.selecionar.emit(event);
  }

  onSelectAllChange(checked: boolean): void {
    this.selecionarTodos.emit(checked);
  }
}
