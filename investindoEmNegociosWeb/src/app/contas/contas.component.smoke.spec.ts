import { of, throwError } from 'rxjs';
import { ContasComponent } from './contas.component';
import { AccountResponse, AccountsService } from '../accounts.service';
import { CategoriesService } from '../categories.service';

class AccountsServiceMock {
  list = jasmine.createSpy().and.returnValue(of([]));
  create = jasmine.createSpy().and.returnValue(of({}));
  update = jasmine.createSpy().and.returnValue(of({}));
  delete = jasmine.createSpy().and.returnValue(of(void 0));
  getBalance = jasmine.createSpy().and.returnValue(of({}));
  listTransactions = jasmine.createSpy().and.returnValue(of([]));
  transfer = jasmine.createSpy().and.returnValue(of({}));
  extractOfx = jasmine.createSpy().and.returnValue(of({ items: [], rawText: '' }));
  importOfx = jasmine.createSpy().and.returnValue(of({ created: 1, skipped: 0 }));
  extractCsv = jasmine.createSpy().and.returnValue(of({ delimiter: ';', detectedColumns: [], items: [], rawText: '' }));
  importCsv = jasmine.createSpy().and.returnValue(of({ created: 1, skipped: 0 }));
}

class CategoriesServiceMock {
  list = jasmine.createSpy().and.returnValue(of([]));
}

describe('ContasComponent smoke', () => {
  let component: ContasComponent;
  let service: AccountsServiceMock;
  let categoriesService: CategoriesServiceMock;

  beforeEach(() => {
    service = new AccountsServiceMock();
    categoriesService = new CategoriesServiceMock();
    component = new ContasComponent(service as unknown as AccountsService, categoriesService as unknown as CategoriesService);
  });

  it('deve carregar contas no init e sincronizar defaults de transferência', () => {
    const accounts: AccountResponse[] = [
      { id: 'a1', name: 'Conta A', type: 'Checking', initialBalance: 0, currentBalance: 100, isActive: true, createdAt: '', updatedAt: '' },
      { id: 'a2', name: 'Conta B', type: 'Savings', initialBalance: 0, currentBalance: 50, isActive: true, createdAt: '', updatedAt: '' }
    ];
    service.list.and.returnValue(of(accounts));

    component.ngOnInit();

    expect(component.accounts.length).toBe(2);
    expect(component.transferFromAccountId).toBeTruthy();
    expect(component.transferToAccountId).toBeTruthy();
  });

  it('deve bloquear transferência inválida (mesma conta)', () => {
    component.accounts = [
      { id: 'a1', name: 'Conta A', type: 'Checking', initialBalance: 0, currentBalance: 100, isActive: true, createdAt: '', updatedAt: '' },
      { id: 'a2', name: 'Conta B', type: 'Savings', initialBalance: 0, currentBalance: 50, isActive: true, createdAt: '', updatedAt: '' }
    ];
    component.transferFromAccountId = 'a1';
    component.transferToAccountId = 'a1';
    component.transferAmount = 10;

    component.transfer();

    expect(service.transfer).not.toHaveBeenCalled();
    expect(component.error).toContain('diferentes');
  });

  it('deve enviar transferência válida', () => {
    component.accounts = [
      { id: 'a1', name: 'Conta A', type: 'Checking', initialBalance: 0, currentBalance: 100, isActive: true, createdAt: '', updatedAt: '' },
      { id: 'a2', name: 'Conta B', type: 'Savings', initialBalance: 0, currentBalance: 50, isActive: true, createdAt: '', updatedAt: '' }
    ];
    component.transferFromAccountId = 'a1';
    component.transferToAccountId = 'a2';
    component.transferAmount = 25;

    component.transfer();

    expect(service.transfer).toHaveBeenCalled();
  });

  it('deve capturar erro da API ao transferir', () => {
    service.transfer.and.returnValue(throwError(() => ({ error: { detail: 'Falha teste' } })));
    component.accounts = [
      { id: 'a1', name: 'Conta A', type: 'Checking', initialBalance: 0, currentBalance: 100, isActive: true, createdAt: '', updatedAt: '' },
      { id: 'a2', name: 'Conta B', type: 'Savings', initialBalance: 0, currentBalance: 50, isActive: true, createdAt: '', updatedAt: '' }
    ];
    component.transferFromAccountId = 'a1';
    component.transferToAccountId = 'a2';
    component.transferAmount = 25;

    component.transfer();

    expect(component.error).toContain('Falha teste');
  });

  it('deve bloquear seleção de OFX sem conta escolhida', () => {
    const input = document.createElement('input');
    const file = new File(['OFX'], 'extrato.ofx', { type: 'application/x-ofx' });
    spyOnProperty(input, 'files').and.returnValue([file] as unknown as FileList);

    component.selectedAccountId = null;
    component.onOfxSelected({ target: input } as unknown as Event);

    expect(service.extractOfx).not.toHaveBeenCalled();
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

    expect(service.importOfx).toHaveBeenCalled();
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

    expect(service.importCsv).toHaveBeenCalled();
  });
});
