import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { GlobalSearchComponent } from './global-search.component';
import { ApiDataService } from '../../data/api-data.service';
import { AccountsStore } from '../../accounts.store';
import { CategoriesStore } from '../../categories.store';

const apiDataMock = {
  cards$: new BehaviorSubject<any[]>([{ id: 'c1', nome: 'Nubank', banco: 'Nu' }]),
  expenses$: new BehaviorSubject<any[]>([
    { id: 'e1', nome: 'Mercado', categoria: 'Alimentação', valor: 10, vencimento: '01/07/2026' }
  ]),
  incomes$: new BehaviorSubject<any[]>([
    { id: 'i1', fonte: 'Salário', categoria: 'Renda', valor: 100, recebimento: '01/07/2026' }
  ])
};
const accountsStoreMock = { accounts: signal<any[]>([{ id: 'a1', name: 'Conta Corrente' }]), load: () => {} };
const categoriesStoreMock = { categories: signal<any[]>([{ id: 'cat1', name: 'Alimentação' }]), load: () => {} };

function build(): GlobalSearchComponent {
  TestBed.configureTestingModule({
    imports: [GlobalSearchComponent],
    providers: [
      provideRouter([]),
      { provide: ApiDataService, useValue: apiDataMock },
      { provide: AccountsStore, useValue: accountsStoreMock },
      { provide: CategoriesStore, useValue: categoriesStoreMock }
    ]
  });
  return TestBed.createComponent(GlobalSearchComponent).componentInstance;
}

describe('GlobalSearchComponent — busca client-side', () => {
  it('não retorna resultados com menos de 2 caracteres', () => {
    const c = build();
    c.onInput('a');
    expect(c.groups().length).toBe(0);
    expect(c.hasResults()).toBeFalse();
    expect(c.open()).toBeFalse();
  });

  it('encontra conta por nome e agrupa em "Contas"', () => {
    const c = build();
    c.onInput('Cont');
    const contas = c.groups().find((g) => g.title === 'Contas');
    expect(contas?.items[0].label).toBe('Conta Corrente');
    expect(c.open()).toBeTrue();
  });

  it('encontra categoria por nome', () => {
    const c = build();
    c.onInput('Aliment');
    const cats = c.groups().find((g) => g.title === 'Categorias');
    expect(cats?.items.map((i) => i.label)).toContain('Alimentação');
  });

  it('resultado de despesa navega com ?q= para pré-filtrar', () => {
    const c = build();
    c.onInput('Merc');
    const desp = c.groups().find((g) => g.title === 'Despesas');
    expect(desp?.items[0].route).toBe('/despesas');
    expect(desp?.items[0].queryParams).toEqual({ q: 'Mercado' });
  });

  it('busca é case-insensitive e cobre cartões/receitas', () => {
    const c = build();
    c.onInput('nu');
    expect(c.groups().find((g) => g.title === 'Cartões')?.items[0].label).toBe('Nubank');
    c.onInput('salár');
    expect(c.groups().find((g) => g.title === 'Receitas')?.items[0].label).toBe('Salário');
  });

  it('sem correspondência, não há resultados', () => {
    const c = build();
    c.onInput('zzzzz');
    expect(c.hasResults()).toBeFalse();
  });
});
