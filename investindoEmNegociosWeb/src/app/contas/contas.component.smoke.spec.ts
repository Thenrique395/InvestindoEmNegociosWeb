import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ContasComponent } from './contas.component';
import { AccountResponse } from '../accounts.service';
import { AccountsStore } from '../accounts.store';
import { CategoriesService } from '../categories.service';
import { UiPermissionsService } from '../ui-permissions.service';

class AccountsStoreMock {
  accountsState = signal<AccountResponse[]>([]);
  loadingState = signal(false);
  errorState = signal<string | null>(null);
  selectedAccountIdState = signal<string | null>(null);
  transactionsState = signal<any[]>([]);
  transactionsLoadingState = signal(false);
  transactionsErrorState = signal<string | null>(null);

  accounts = this.accountsState.asReadonly();
  loading = this.loadingState.asReadonly();
  error = this.errorState.asReadonly();
  selectedAccountId = this.selectedAccountIdState.asReadonly();
  transactions = this.transactionsState.asReadonly();
  transactionsLoading = this.transactionsLoadingState.asReadonly();
  transactionsError = this.transactionsErrorState.asReadonly();

  load = jasmine.createSpy('load').and.callFake(() => {
    const firstAccountId = this.accountsState()[0]?.id ?? null;
    if (!this.selectedAccountIdState()) {
      this.selectedAccountIdState.set(firstAccountId);
    }
  });
  create = jasmine.createSpy('create');
  update = jasmine.createSpy('update');
  delete = jasmine.createSpy('delete');
  selectAccount = jasmine.createSpy('selectAccount').and.callFake((accountId: string) => {
    this.selectedAccountIdState.set(accountId);
  });
  loadTransactions = jasmine.createSpy('loadTransactions');
  transfer = jasmine.createSpy('transfer').and.callFake((_payload: any, done?: () => void) => done?.());
  extractOfx = jasmine.createSpy('extractOfx').and.returnValue(of({ items: [], rawText: '' }));
  importOfx = jasmine.createSpy('importOfx').and.callFake((_payload: any, done?: () => void) => done?.());
  extractCsv = jasmine.createSpy('extractCsv').and.returnValue(of({ delimiter: ';', detectedColumns: [], items: [], rawText: '' }));
  importCsv = jasmine.createSpy('importCsv').and.callFake((_payload: any, done?: () => void) => done?.());
}

class CategoriesServiceMock {
  list = jasmine.createSpy('list').and.returnValue(of([]));
}

class UiPermissionsServiceMock {
  can = jasmine.createSpy('can').and.returnValue(true);
  canManageAccounts = jasmine.createSpy('canManageAccounts').and.returnValue(true);
  canImportAccounts = jasmine.createSpy('canImportAccounts').and.returnValue(true);
  canViewCardStatements = jasmine.createSpy('canViewCardStatements').and.returnValue(true);
  canImportInvoices = jasmine.createSpy('canImportInvoices').and.returnValue(true);
}

describe('ContasComponent smoke', () => {
  let component: ContasComponent;
  let store: AccountsStoreMock;
  let categoriesService: CategoriesServiceMock;

  beforeEach(() => {
    store = new AccountsStoreMock();
    categoriesService = new CategoriesServiceMock();
    component = TestBed.runInInjectionContext(() =>
      new ContasComponent(
        store as unknown as AccountsStore,
        categoriesService as unknown as CategoriesService,
        new UiPermissionsServiceMock() as unknown as UiPermissionsService
      )
    );
  });

  it('deve carregar contas e categorias no init', () => {
    store.accountsState.set([
      createAccount('a1', 'Conta A'),
      createAccount('a2', 'Conta B')
    ]);

    component.ngOnInit();

    expect(store.load).toHaveBeenCalledWith(true);
    expect(categoriesService.list).toHaveBeenCalled();
  });

  it('deve bloquear transferência inválida entre a mesma conta', () => {
    store.accountsState.set([
      createAccount('a1', 'Conta A'),
      createAccount('a2', 'Conta B')
    ]);
    component.onTransferChange({
      fromAccountId: 'a1',
      toAccountId: 'a1',
      amount: 10,
      occurredAtInput: '',
      description: ''
    });

    component.transfer();

    expect(store.transfer).not.toHaveBeenCalled();
    expect(component.error).toContain('diferentes');
  });

  it('deve enviar transferência válida ao store', () => {
    component.onTransferChange({
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 25,
      occurredAtInput: '',
      description: 'Reserva'
    });

    component.transfer();

    expect(store.transfer).toHaveBeenCalled();
    expect(store.transfer.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      fromAccountId: 'a1',
      toAccountId: 'a2',
      amount: 25
    }));
  });

  it('deve bloquear seleção de OFX sem conta escolhida', () => {
    const input = document.createElement('input');
    const file = new File(['OFX'], 'extrato.ofx', { type: 'application/x-ofx' });
    spyOnProperty(input, 'files').and.returnValue([file] as unknown as FileList);

    component.selectedAccountId = null;
    component.onOfxSelected({ target: input } as unknown as Event);

    expect(store.extractOfx).not.toHaveBeenCalled();
    expect(component.error).toContain('Selecione uma conta');
  });

  it('deve enviar importação OFX para a conta selecionada', () => {
    component.selectedAccountId = 'a1';
    component.ofxExtract = {
      rawText: 'OFX',
      items: [
        {
          postedAt: '2026-03-01T00:00:00Z',
          amount: 10,
          kind: 'Debit',
          description: 'Padaria',
          memo: 'Compra',
          externalId: 'FIT-1',
          type: 'DEBIT',
          isDuplicate: false
        }
      ]
    };

    component.importOfx();

    expect(store.importOfx).toHaveBeenCalled();
  });

  it('deve enviar importação CSV para a conta selecionada', () => {
    component.selectedAccountId = 'a1';
    component.csvExtract = {
      delimiter: ';',
      detectedColumns: ['data', 'descricao', 'valor'],
      rawText: 'CSV',
      items: [
        {
          postedAt: '2026-03-01T00:00:00Z',
          amount: 10,
          kind: 'Debit',
          description: 'Padaria',
          memo: null,
          externalId: '1',
          type: 'DEBIT',
          isDuplicate: false
        }
      ]
    };

    component.importCsv();

    expect(store.importCsv).toHaveBeenCalled();
  });
});

function createAccount(id: string, name: string): AccountResponse {
  return {
    id,
    name,
    type: 'Checking',
    initialBalance: 0,
    currentBalance: 100,
    isActive: true,
    createdAt: '',
    updatedAt: ''
  };
}
