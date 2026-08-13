import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableComponent } from './data-table.component';
import type { ColumnDef } from './data-table.types';

interface Linha {
  id: string;
  nome: string;
  valor: number;
}

const COLUNAS: ColumnDef<Linha>[] = [
  { key: 'nome', label: 'Nome', width: 'minmax(180px,2.1fr)', sortable: true },
  { key: 'valor', label: 'Valor', width: '112px', align: 'right' },
];

const LINHAS: Linha[] = [
  { id: 'a', nome: 'Aluguel', valor: 2400 },
  { id: 'b', nome: 'Energia', valor: 318 },
  { id: 'c', nome: 'Internet', valor: 120 },
];

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<DataTableComponent<Linha>>;
  let component: DataTableComponent<Linha>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTableComponent] }).compileComponents();
    fixture = TestBed.createComponent<DataTableComponent<Linha>>(DataTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', COLUNAS);
    fixture.componentRef.setInput('rows', LINHAS);
    fixture.detectChanges();
  });

  describe('grade compartilhada', () => {
    it('deriva grid-template-columns das colunas', () => {
      expect(component.gridTemplate()).toBe('minmax(180px,2.1fr) 112px');
    });

    it('abre espaço para a caixa de seleção quando selecionável', () => {
      fixture.componentRef.setInput('selectable', true);
      expect(component.gridTemplate()).toBe('28px minmax(180px,2.1fr) 112px');
    });

    it('cabeçalho e linhas usam exatamente a mesma grade', () => {
      const head = fixture.nativeElement.querySelector('.dt__head') as HTMLElement;
      const row = fixture.nativeElement.querySelector('.dt__row') as HTMLElement;
      expect(head.style.gridTemplateColumns).toBe(row.style.gridTemplateColumns);
    });
  });

  describe('min-width do scroller', () => {
    it('soma larguras fixas e o piso das flexíveis', () => {
      // 180 (piso do minmax) + 112 (fixa) + 2 colunas * 16 de gap
      expect(component.minWidth()).toBe(180 + 112 + 32);
    });
  });

  describe('seleção', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('selectable', true);
      fixture.detectChanges();
    });

    it('alterna uma linha', () => {
      component.toggleRow(LINHAS[0]);
      expect(component.isSelected(LINHAS[0])).toBeTrue();
      component.toggleRow(LINHAS[0]);
      expect(component.isSelected(LINHAS[0])).toBeFalse();
    });

    it('seleciona e limpa todas', () => {
      component.toggleAll();
      expect(component.allSelected()).toBeTrue();
      expect(component.selectedRows().length).toBe(3);
      component.toggleAll();
      expect(component.selectedKeys().size).toBe(0);
    });

    it('estado indeterminado com seleção parcial', () => {
      component.toggleRow(LINHAS[0]);
      expect(component.someSelected()).toBeTrue();
      expect(component.allSelected()).toBeFalse();
    });

    it('emite as linhas selecionadas', () => {
      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);
      component.toggleRow(LINHAS[1]);
      expect(spy).toHaveBeenCalledWith([LINHAS[1]]);
    });
  });

  describe('ordenação', () => {
    it('alterna asc → desc na mesma coluna', () => {
      const emitido: unknown[] = [];
      component.sortChange.subscribe((s) => emitido.push(s));

      component.onSort(COLUNAS[0]);
      expect(emitido[0]).toEqual({ key: 'nome', direction: 'asc' });

      fixture.componentRef.setInput('sort', { key: 'nome', direction: 'asc' });
      component.onSort(COLUNAS[0]);
      expect(emitido[1]).toEqual({ key: 'nome', direction: 'desc' });
    });

    it('ignora coluna não ordenável', () => {
      const spy = jasmine.createSpy('sortChange');
      component.sortChange.subscribe(spy);
      component.onSort(COLUNAS[1]);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('paginação', () => {
    it('calcula o total de páginas arredondando para cima', () => {
      fixture.componentRef.setInput('page', { index: 0, size: 10, total: 25 });
      expect(component.totalPages()).toBe(3);
    });

    it('não quebra com tamanho de página zero', () => {
      fixture.componentRef.setInput('page', { index: 0, size: 0, total: 25 });
      expect(component.totalPages()).toBe(0);
    });
  });

  it('mostra a mensagem de vazio sem linhas', () => {
    fixture.componentRef.setInput('rows', []);
    fixture.componentRef.setInput('emptyMessage', 'Nenhuma despesa.');
    fixture.detectChanges();
    expect((fixture.nativeElement.textContent as string)).toContain('Nenhuma despesa.');
  });
});
