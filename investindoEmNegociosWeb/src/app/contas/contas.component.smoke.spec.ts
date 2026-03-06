import { of, throwError } from 'rxjs';
import { ContasComponent } from './contas.component';
import { AccountResponse, AccountsService } from '../accounts.service';

class AccountsServiceMock {
  list = jasmine.createSpy().and.returnValue(of([]));
  create = jasmine.createSpy().and.returnValue(of({}));
  update = jasmine.createSpy().and.returnValue(of({}));
  delete = jasmine.createSpy().and.returnValue(of(void 0));
  getBalance = jasmine.createSpy().and.returnValue(of({}));
  listTransactions = jasmine.createSpy().and.returnValue(of([]));
  transfer = jasmine.createSpy().and.returnValue(of({}));
}

describe('ContasComponent smoke', () => {
  let component: ContasComponent;
  let service: AccountsServiceMock;

  beforeEach(() => {
    service = new AccountsServiceMock();
    component = new ContasComponent(service as unknown as AccountsService);
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
});
