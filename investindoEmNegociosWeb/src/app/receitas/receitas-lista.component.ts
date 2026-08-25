import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StoredIncome } from '../data/api-data.service';
import { resolveInstallmentStatus, incomeStatusLabel, installmentStatusIcon, installmentStatusTone } from '../utils/status';
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
  @Output() historico = new EventEmitter<string>();
  @Output() selecionar = new EventEmitter<{ id: string; checked: boolean }>();
  @Output() selecionarTodos = new EventEmitter<boolean>();
  @Output() ordenar = new EventEmitter<'fonte' | 'categoria' | 'valor' | 'recebimento' | 'tipo' | 'status'>();
  @Output() emptyAction = new EventEmitter<void>();

  get columns(): ResponsiveListColumn[] {
    // Ordem do design: identificação, classificação, situação e só então os
    // números — o valor fica encostado nas ações, na borda direita.
    const base: ResponsiveListColumn[] = [
      { truncate: true, key: 'fonte', label: 'Fonte', sortable: true },
      { truncate: true, key: 'categoria', label: 'Categoria', sortable: true },
      { truncate: true, key: 'tipo', label: 'Tipo', sortable: true }
    ];
    if (this.showStatus) {
      base.push({ key: 'status', label: 'Status', sortable: true });
    }
    base.push({ key: 'recebimento', label: 'Receb.', sortable: true });
    base.push({ key: 'valor', label: 'Valor', sortable: true, align: 'end' });
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

  /** Segunda linha da fonte: recorrência, quando houver. */
  subtitulo(r: StoredIncome): string {
    if (!r.fixa) return '';
    const dia = (r.recebimento || '').slice(0, 2);
    return dia ? `Recorrente · todo dia ${dia}` : 'Recorrente';
  }

  /** Dentro de um mês, o ano é ruído: a competência já está no título. */
  dataCurta(valor?: string): string {
    if (!valor) return '—';
    const [dia, mes] = valor.split('/');
    return dia && mes ? `${dia}/${mes}` : valor;
  }

  statusLabel(renda: StoredIncome): string {
    return incomeStatusLabel(resolveInstallmentStatus(renda.status, renda.recebimento));
  }

  statusTone(renda: StoredIncome) {
    return installmentStatusTone(resolveInstallmentStatus(renda.status, renda.recebimento));
  }

  statusIcon(renda: StoredIncome) {
    return installmentStatusIcon(resolveInstallmentStatus(renda.status, renda.recebimento));
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
