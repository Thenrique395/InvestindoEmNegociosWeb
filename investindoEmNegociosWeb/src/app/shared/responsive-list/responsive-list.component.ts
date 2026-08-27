import { ChangeDetectionStrategy, Component, TemplateRef, computed, contentChildren, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ResponsiveListCellDirective } from './responsive-list-cell.directive';

export interface ResponsiveListColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'start' | 'end';
  /**
   * Largura da coluna como VALOR ('28%', '12rem', 'minmax(180px,2.1fr)') —
   * ARQUITETURA_ANGULAR.md §7. Aplicada pelo primitivo no `<th>`.
   *
   * Substitui `widthClass`: a classe era aplicada dentro deste template, então
   * carregava o `_ngcontent` do primitivo e a feature só conseguia estilizá-la
   * furando o encapsulamento com `::ng-deep`.
   */
  width?: string;
  minWidth?: string;
  /** @deprecated Use `width`/`minWidth`. Mantido só para não quebrar consumidor antigo. */
  widthClass?: string;
  /**
   * Coluna que pode encolher e cortar com reticências em vez de empurrar a
   * tabela para a rolagem horizontal. Opt-in: só as colunas de texto livre —
   * nome, categoria, forma de pagamento. Nunca em valor, data ou status, que
   * perdem o sentido pela metade.
   */
  truncate?: boolean;
  /**
   * Coluna de ações: no card do mobile ela sobe para o topo, alinhada à direita
   * e sem etiqueta — o botão é a primeira coisa que a pessoa alcança com o polegar.
   * Mesma mecânica da coluna de seleção; opt-in porque nem toda lista tem ações.
   */
  actions?: boolean;
}

@Component({
  selector: 'app-responsive-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, EmptyStateComponent],
  templateUrl: './responsive-list.component.html',
  styleUrl: './responsive-list.component.scss'
})
export class ResponsiveListComponent<T> {
  readonly columns = input<ResponsiveListColumn[]>([]);
  readonly items = input<T[]>([]);
  readonly getId = input<(item: T) => string>((item) => String((item as { id?: string })?.id ?? ''));

  readonly sortBy = input<string | null>(null);
  readonly sortDir = input<1 | -1>(1);

  /**
   * `comfortable` dá mais respiro vertical à linha — listas com controle
   * embutido na célula (input, botão de editar) ficam apertadas na densidade
   * padrão. Mora aqui, não na feature: era o motivo de dois `::ng-deep`.
   */
  readonly density = input<'default' | 'comfortable'>('default');

  readonly loading = input(false);
  readonly loadingLabel = input('Carregando...');

  readonly emptyTitle = input('Nenhum registro encontrado');
  readonly emptyDescription = input('Crie o primeiro item para começar.');
  readonly emptyCtaLabel = input<string | undefined>(undefined);
  readonly emptyIcon = input('✨');

  readonly selectable = input(false);
  readonly selectedIds = input<string[]>([]);
  readonly selectableIds = input<string[] | null>(null);

  /* Paginação: 0 desliga (é o padrão, então as listas que não pedem página
     continuam mostrando tudo). O fatiamento é interno — quem usa continua
     entregando a lista inteira já filtrada e ordenada. */
  readonly pageSize = input(0);
  readonly itemsLabel = input('itens');

  readonly sort = output<string>();
  readonly selectionChange = output<{ id: string; checked: boolean }>();
  readonly selectAllChange = output<boolean>();
  readonly emptyAction = output<void>();

  private readonly cellDirectives = contentChildren(ResponsiveListCellDirective);

  /**
   * Página escolhida pela pessoa. O valor que a tela usa é o `page` abaixo, que
   * a limita ao total atual — antes isso era `this.page = ...` dentro de
   * `ngOnChanges`, ou seja, estado derivado escrito à mão (ARQUITETURA_ANGULAR.md
   * §4.2). Como `computed`, a lista que encolhe já traz a página para um valor
   * válido sozinha, sem hook de ciclo de vida.
   */
  private readonly paginaEscolhida = signal(1);

  readonly totalPages = computed(() => {
    const tamanho = this.pageSize();
    if (tamanho <= 0) return 1;
    return Math.max(1, Math.ceil(this.items().length / tamanho));
  });

  readonly page = computed(() => Math.min(this.paginaEscolhida(), this.totalPages()) || 1);

  readonly paginado = computed(() => this.pageSize() > 0 && this.items().length > this.pageSize());

  readonly pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  readonly visibleItems = computed(() => {
    if (!this.paginado()) return this.items();
    const inicio = (this.page() - 1) * this.pageSize();
    return this.items().slice(inicio, inicio + this.pageSize());
  });

  readonly rangeLabel = computed(
    () => `Mostrando ${this.visibleItems().length} de ${this.items().length} ${this.itemsLabel()}`
  );

  /**
   * Índice por chave de coluna. Era um `find()` por célula: com N linhas e M
   * colunas o template fazia N×M buscas lineares a cada verificação.
   */
  private readonly templatePorColuna = computed(() => {
    const mapa = new Map<string, TemplateRef<{ $implicit: T }>>();
    for (const cell of this.cellDirectives()) {
      mapa.set(cell.column, cell.template as TemplateRef<{ $implicit: T }>);
    }
    return mapa;
  });

  private readonly selectableCount = computed(
    () => this.items().filter((item) => this.isRowSelectable(item)).length
  );

  private readonly selectedSelectableCount = computed(
    () => this.items().filter((item) => this.isRowSelectable(item) && this.isRowSelected(item)).length
  );

  readonly allSelected = computed(
    () => this.selectableCount() > 0 && this.selectedSelectableCount() === this.selectableCount()
  );

  readonly someSelected = computed(
    () => this.selectedSelectableCount() > 0 && this.selectedSelectableCount() < this.selectableCount()
  );

  irParaPagina(pagina: number): void {
    this.paginaEscolhida.set(Math.min(Math.max(1, pagina), this.totalPages()));
  }

  cellTemplate(columnKey: string): TemplateRef<{ $implicit: T }> | null {
    return this.templatePorColuna().get(columnKey) ?? null;
  }

  sortByColumn(key: string): void {
    this.sort.emit(key);
  }

  isRowSelectable(item: T): boolean {
    const permitidos = this.selectableIds();
    if (!permitidos) return true;
    return permitidos.includes(this.getId()(item));
  }

  isRowSelected(item: T): boolean {
    return this.selectedIds().includes(this.getId()(item));
  }

  onSelectAllChange(checked: boolean): void {
    this.selectAllChange.emit(checked);
  }

  onRowSelectionChange(item: T, checked: boolean): void {
    this.selectionChange.emit({ id: this.getId()(item), checked });
  }

  trackByRow = (_: number, item: T): string => this.getId()(item);
}
