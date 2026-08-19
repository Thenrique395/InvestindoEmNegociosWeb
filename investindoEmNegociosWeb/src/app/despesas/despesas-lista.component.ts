import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StoredExpense } from '../data/api-data.service';
import { expenseStatusLabel, installmentStatusTone, resolveInstallmentStatus } from '../utils/status';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { ResponsiveListComponent, ResponsiveListColumn } from '../shared/responsive-list/responsive-list.component';
import { ResponsiveListCellDirective } from '../shared/responsive-list/responsive-list-cell.directive';
import { AppCurrencyPipe } from '../shared/app-currency.pipe';

@Component({
  selector: 'app-despesas-lista',
  standalone: true,
  imports: [StatusBadgeComponent, ResponsiveListComponent, ResponsiveListCellDirective, AppCurrencyPipe],
  templateUrl: './despesas-lista.component.html',
  styleUrls: ['./despesas-lista.component.scss']
})
export class DespesasListaComponent {
  @Input() despesas: StoredExpense[] = [];
  @Input() emptyTitle = 'Sem despesas neste período';
  @Input() emptyDescription = 'Adicione sua primeira despesa para começar o controle.';
  @Input() emptyCtaLabel = 'Adicionar despesa';
  @Input() sortBy: 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | 'status' | null = null;
  @Input() sortDir: 1 | -1 = 1;
  @Input() pagamentoLabelFn?: (d: StoredExpense) => string;
  @Input() cardLabelFn?: (id?: string) => string;
  @Input() selectedIds: string[] = [];

  @Output() ordenar = new EventEmitter<'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | 'status'>();
  @Output() editar = new EventEmitter<string>();
  @Output() remover = new EventEmitter<string>();
  @Output() pagar = new EventEmitter<string>();
  @Output() historico = new EventEmitter<string>();
  @Output() selecionar = new EventEmitter<{ id: string; checked: boolean }>();
  @Output() selecionarTodos = new EventEmitter<boolean>();
  @Output() emptyAction = new EventEmitter<void>();

  readonly columns: ResponsiveListColumn[] = [
    { key: 'nome', label: 'Nome', sortable: true },
    { key: 'categoria', label: 'Categoria', sortable: true },
    { key: 'pagamento', label: 'Pagamento', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'vencimento', label: 'Venc.', sortable: true },
    { key: 'valor', label: 'Valor', sortable: true, align: 'end' },
    { key: 'acoes', label: 'Ações', align: 'end' }
  ];

  ordenarPor(campo: string): void {
    this.ordenar.emit(campo as 'nome' | 'categoria' | 'pagamento' | 'vencimento' | 'valor' | 'status');
  }

  /**
   * Segunda linha do nome: recorrência ou parcelamento. Sai do próprio
   * lançamento — não há campo de observação no modelo, então nada é inventado.
   */
  subtitulo(d: StoredExpense): string {
    if (d.fixa) {
      const dia = (d.vencimento || '').slice(0, 2);
      return dia ? `Recorrente · todo dia ${dia}` : 'Recorrente';
    }
    if (d.parcelasTotal && d.parcelasTotal > 1) return `Parcelamento em ${d.parcelasTotal}x`;
    return '';
  }

  /** Dentro de um mês, o ano é ruído: a competência já está no título. */
  dataCurta(valor?: string): string {
    if (!valor) return '—';
    const [dia, mes] = valor.split('/');
    return dia && mes ? `${dia}/${mes}` : valor;
  }

  pagamentoLabel(d: StoredExpense): string {
    return this.pagamentoLabelFn ? this.pagamentoLabelFn(d) : d.cartao ? 'Cartão' : 'À vista';
  }

  cardLabel(id?: string): string {
    return this.cardLabelFn ? this.cardLabelFn(id) : id || '';
  }

  /* A etiqueta mostra o status derivado: uma parcela em aberto e vencida
     aparece como "Atrasada", que é o que a pessoa precisa ver primeiro. */
  statusLabel(d: StoredExpense): string {
    return expenseStatusLabel(resolveInstallmentStatus(d.status, d.vencimento));
  }

  statusTone(d: StoredExpense) {
    return installmentStatusTone(resolveInstallmentStatus(d.status, d.vencimento));
  }

  isSelecionavel(despesa: StoredExpense): boolean {
    return despesa.status !== 'PAID' && despesa.status !== 'CANCELED';
  }

  get selectableIds(): string[] {
    return this.despesas.filter((d) => this.isSelecionavel(d) && d.id).map((d) => d.id!);
  }

  getId = (d: StoredExpense): string => d.id || '';

  onSort(column: string): void {
    this.ordenarPor(column);
  }

  onSelectionChange(event: { id: string; checked: boolean }): void {
    this.selecionar.emit(event);
  }

  onSelectAllChange(checked: boolean): void {
    this.selecionarTodos.emit(checked);
  }
}
