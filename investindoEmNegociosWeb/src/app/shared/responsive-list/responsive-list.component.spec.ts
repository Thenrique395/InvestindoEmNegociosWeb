import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ResponsiveListComponent, ResponsiveListColumn } from './responsive-list.component';
import { ResponsiveListCellDirective } from './responsive-list-cell.directive';

interface Item {
  id: string;
  nome: string;
}

@Component({
  standalone: true,
  imports: [ResponsiveListComponent, ResponsiveListCellDirective],
  template: `
    <app-responsive-list
      [columns]="columns"
      [items]="items"
      [getId]="getId"
      [sortBy]="sortBy"
      [sortDir]="sortDir"
      [loading]="loading"
      [selectable]="selectable"
      [selectedIds]="selectedIds"
      [selectableIds]="selectableIds"
      [emptyTitle]="'Vazio'"
      [emptyDescription]="'Nada aqui'"
      (sort)="onSort($event)"
      (selectionChange)="onSelectionChange($event)"
      (selectAllChange)="onSelectAllChange($event)">
      <ng-template appResponsiveListCell="nome" let-item>{{ item.nome }}</ng-template>
    </app-responsive-list>
  `
})
class HostComponent {
  columns: ResponsiveListColumn[] = [{ key: 'nome', label: 'Nome', sortable: true }];
  items: Item[] = [
    { id: '1', nome: 'Aluguel' },
    { id: '2', nome: 'Internet' }
  ];
  getId = (item: Item) => item.id;
  sortBy: string | null = null;
  sortDir: 1 | -1 = 1;
  loading = false;
  selectable = false;
  selectedIds: string[] = [];
  selectableIds: string[] | null = null;

  sortEvents: string[] = [];
  selectionEvents: { id: string; checked: boolean }[] = [];
  selectAllEvents: boolean[] = [];

  onSort(column: string): void {
    this.sortEvents.push(column);
  }

  onSelectionChange(event: { id: string; checked: boolean }): void {
    this.selectionEvents.push(event);
  }

  onSelectAllChange(checked: boolean): void {
    this.selectAllEvents.push(checked);
  }
}

describe('ResponsiveListComponent', () => {
  function createHost() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza uma linha por item usando o template de célula projetado', () => {
    const fixture = createHost();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Aluguel');
    expect(fixture.nativeElement.textContent).toContain('Internet');
  });

  it('emite sort ao clicar no cabeçalho ordenável', () => {
    const fixture = createHost();

    const sortButton: HTMLButtonElement = fixture.nativeElement.querySelector('.responsive-list__sort');
    sortButton.click();

    expect(fixture.componentInstance.sortEvents).toEqual(['nome']);
  });

  it('mostra o EmptyStateComponent quando não há itens', () => {
    const fixture = createHost();
    fixture.componentInstance.items = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Vazio');
    expect(fixture.nativeElement.textContent).toContain('Nada aqui');
  });

  it('mostra o estado de loading quando loading é true', () => {
    const fixture = createHost();
    fixture.componentInstance.loading = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.responsive-list__spinner')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('emite selectionChange ao marcar uma linha individual', () => {
    const fixture = createHost();
    fixture.componentInstance.selectable = true;
    fixture.detectChanges();

    const checkboxes: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('.responsive-list__item--checkbox input'));
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.selectionEvents).toEqual([{ id: '1', checked: true }]);
  });

  it('emite selectAllChange e calcula o estado indeterminado corretamente', () => {
    const fixture = createHost();
    fixture.componentInstance.selectable = true;
    fixture.componentInstance.selectedIds = ['1'];
    fixture.detectChanges();

    const headerCheckbox: HTMLInputElement = fixture.nativeElement.querySelector('.responsive-list__cell--checkbox input');
    expect(headerCheckbox.indeterminate).toBeTrue();

    headerCheckbox.checked = true;
    headerCheckbox.dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.selectAllEvents).toEqual([true]);
  });

  it('desabilita o checkbox de linhas fora de selectableIds', () => {
    const fixture = createHost();
    fixture.componentInstance.selectable = true;
    fixture.componentInstance.selectableIds = ['1'];
    fixture.detectChanges();

    const checkboxes: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('.responsive-list__item--checkbox input'));
    expect(checkboxes[0].disabled).toBeFalse();
    expect(checkboxes[1].disabled).toBeTrue();
  });
});
