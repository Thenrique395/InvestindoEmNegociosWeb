import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ApiDataService, StoredCard, StoredExpense, StoredIncome } from '../data/api-data.service';
import { LoansService } from '../loans.service';
import { GoalsService } from '../goals.service';
import { AccountsService } from '../accounts.service';
import { UiPermissionsService } from '../ui-permissions.service';
import { Router } from '@angular/router';
import { CalendarioComponent } from './calendario.component';
import { setLocaleSettings } from '../utils/locale-settings';

class ApiDataServiceMock {
  private readonly expensesSubject = new BehaviorSubject<StoredExpense[]>([]);
  private readonly incomesSubject = new BehaviorSubject<StoredIncome[]>([]);
  private readonly cardsSubject = new BehaviorSubject<StoredCard[]>([]);

  readonly expenses$ = this.expensesSubject.asObservable();
  readonly incomes$ = this.incomesSubject.asObservable();
  readonly cards$ = this.cardsSubject.asObservable();

  markExpensePaid = jasmine.createSpy('markExpensePaid').and.returnValue(of({}));
  markIncomeReceived = jasmine.createSpy('markIncomeReceived').and.returnValue(of({}));

  emitExpenses(items: StoredExpense[]): void { this.expensesSubject.next(items); }
  emitIncomes(items: StoredIncome[]): void { this.incomesSubject.next(items); }
  emitCards(items: StoredCard[]): void { this.cardsSubject.next(items); }
}

class LoansServiceMock { list = () => of([]); }
class GoalsServiceMock { list = () => of([]); }
class AccountsServiceMock { getDefaultAccountId = () => null; }
class UiPermissionsServiceMock { canUseAdvancedCalendarViews = () => true; }
class RouterMock { navigate = jasmine.createSpy('navigate'); }

describe('CalendarioComponent', () => {
  let component: CalendarioComponent;
  let fixture: ComponentFixture<CalendarioComponent>;
  let dataService: ApiDataServiceMock;

  beforeEach(async () => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });

    await TestBed.configureTestingModule({
      imports: [CalendarioComponent],
      providers: [
        { provide: ApiDataService, useClass: ApiDataServiceMock },
        { provide: LoansService, useClass: LoansServiceMock },
        { provide: GoalsService, useClass: GoalsServiceMock },
        { provide: AccountsService, useClass: AccountsServiceMock },
        { provide: UiPermissionsService, useClass: UiPermissionsServiceMock },
        { provide: Router, useClass: RouterMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarioComponent);
    component = fixture.componentInstance;
    dataService = TestBed.inject(ApiDataService) as unknown as ApiDataServiceMock;
  });

  function seed(): void {
    component.currentMonth = new Date(2026, 2, 1); // março/2026
    component.selectedDate = new Date(2026, 2, 15);

    dataService.emitExpenses([
      { id: 'e1', nome: 'Aluguel', categoria: 'Moradia', valor: 1200, vencimento: '15/03/2026', status: 'OPEN' },
      { id: 'e2', nome: 'Internet', categoria: 'Casa', valor: 120, vencimento: '20/03/2026', status: 'OPEN' }
    ]);
    dataService.emitIncomes([
      { id: 'i1', fonte: 'Salario', categoria: 'Trabalho', valor: 5000, recebimento: '15/03/2026', status: 'OPEN' }
    ]);
    dataService.emitCards([
      { id: 'c1', bandeira: '1', numero: '1111', nome: 'Nubank', banco: 'Nubank', limiteCredito: 1000, diaFechamento: 8, diaVencimento: 15 }
    ]);
  }

  it('cria o componente e deriva eventos do dia selecionado', () => {
    fixture.detectChanges();
    seed();
    fixture.detectChanges();

    // 15/03: Aluguel (despesa), Salario (receita), Vencimento Nubank (dia 15)
    expect(component.dayEvents.length).toBe(3);
    expect(component.dayEvents.some((e) => e.title.includes('Aluguel'))).toBeTrue();
    expect(component.dayEvents.some((e) => e.group === 'card')).toBeTrue();
  });

  it('calcula o resumo do período (receitas, despesas e saldo)', () => {
    fixture.detectChanges();
    seed();
    fixture.detectChanges();

    expect(component.periodSummary.incomeForecast).toBe(5000);
    expect(component.periodSummary.expenseForecast).toBe(1320);
    expect(component.periodSummary.projectedBalance).toBe(3680);
  });

  it('filtra por tipo (grupo)', () => {
    fixture.detectChanges();
    seed();
    fixture.detectChanges();

    component.setGroupFilter('expense');
    expect(component.dayEvents.every((e) => e.group === 'expense')).toBeTrue();
    expect(component.dayEvents.length).toBe(1);
  });

  it('filtra por categoria e status quando avançado', () => {
    fixture.detectChanges();
    seed();
    fixture.detectChanges();

    // março/2026 é passado em relação ao "hoje" real → despesas em aberto ficam atrasadas
    component.selectedCategory = 'Moradia';
    component.selectedStatus = 'overdue';
    component.onFilterChange();

    expect(component.dayEvents.length).toBe(1);
    expect(component.dayEvents[0].title).toContain('Aluguel');
  });

  it('troca de visualização', () => {
    fixture.detectChanges();
    seed();
    fixture.detectChanges();

    component.setView('timeline');
    expect(component.view).toBe('timeline');
    expect(Array.isArray(component.timelineBuckets)).toBeTrue();
  });

  it('navega entre meses e reposiciona a seleção', () => {
    fixture.detectChanges();
    component.currentMonth = new Date(2026, 2, 1);
    component.selectedDate = new Date(2026, 2, 10);

    component.nextMonth();
    expect(component.currentMonth.getMonth()).toBe(3);
    expect(component.selectedDate.getMonth()).toBe(3);

    component.previousMonth();
    expect(component.currentMonth.getMonth()).toBe(2);
  });

  it('troca o mês ao selecionar um dia de outro mês', () => {
    fixture.detectChanges();
    component.currentMonth = new Date(2026, 2, 1);
    component.selectDate(new Date(2026, 3, 2));

    expect(component.currentMonth.getMonth()).toBe(3);
    expect(component.selectedDate.getDate()).toBe(2);
  });

  it('marca despesa como paga delegando ao serviço', () => {
    fixture.detectChanges();
    seed();
    fixture.detectChanges();

    const expenseEvent = component.dayEvents.find((e) => e.group === 'expense')!;
    component.markDone(expenseEvent);

    expect(dataService.markExpensePaid).toHaveBeenCalledWith('e1', 1200, null);
  });

  it('marca receita como recebida delegando ao serviço', () => {
    fixture.detectChanges();
    seed();
    fixture.detectChanges();

    const incomeEvent = component.dayEvents.find((e) => e.group === 'income')!;
    component.markDone(incomeEvent);

    expect(dataService.markIncomeReceived).toHaveBeenCalledWith('i1', 5000, null);
  });

  it('navega ao criar novo evento a partir do menu', () => {
    fixture.detectChanges();
    const router = TestBed.inject(Router) as unknown as RouterMock;

    component.createFor('/receitas');
    expect(router.navigate).toHaveBeenCalledWith(['/receitas']);
    expect(component.showNewMenu).toBeFalse();
  });
});
