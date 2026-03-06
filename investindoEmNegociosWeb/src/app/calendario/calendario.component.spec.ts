import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ApiDataService, StoredCard, StoredExpense, StoredIncome } from '../data/api-data.service';
import { AccountsService } from '../accounts.service';
import { CalendarioComponent } from './calendario.component';
import { setLocaleSettings } from '../utils/locale-settings';

class ApiDataServiceMock {
  private readonly expensesSubject = new BehaviorSubject<StoredExpense[]>([]);
  private readonly incomesSubject = new BehaviorSubject<StoredIncome[]>([]);
  private readonly cardsSubject = new BehaviorSubject<StoredCard[]>([]);

  readonly expenses$ = this.expensesSubject.asObservable();
  readonly incomes$ = this.incomesSubject.asObservable();
  readonly cards$ = this.cardsSubject.asObservable();

  emitExpenses(items: StoredExpense[]): void {
    this.expensesSubject.next(items);
  }

  emitIncomes(items: StoredIncome[]): void {
    this.incomesSubject.next(items);
  }

  emitCards(items: StoredCard[]): void {
    this.cardsSubject.next(items);
  }
}

class AccountsServiceMock {
  getDefaultAccountId(): string | null {
    return null;
  }
}

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
        { provide: AccountsService, useClass: AccountsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarioComponent);
    component = fixture.componentInstance;
    dataService = TestBed.inject(ApiDataService) as unknown as ApiDataServiceMock;
  });

  function setMonthAndSeedData(): void {
    component.currentMonth = new Date(2026, 2, 1); // março/2026
    component.selectedDate = new Date(2026, 2, 15);

    dataService.emitExpenses([
      {
        id: 'e1',
        nome: 'Aluguel',
        categoria: 'Moradia',
        valor: 1200,
        vencimento: '15/03/2026',
        status: 'OPEN'
      },
      {
        id: 'e2',
        nome: 'Internet',
        categoria: 'Casa',
        valor: 120,
        vencimento: '20/03/2026',
        status: 'OPEN'
      }
    ]);

    dataService.emitIncomes([
      {
        id: 'i1',
        fonte: 'Salario',
        categoria: 'Trabalho',
        valor: 5000,
        recebimento: '15/03/2026',
        status: 'OPEN'
      }
    ]);

    dataService.emitCards([
      {
        id: 'c1',
        bandeira: '1',
        numero: '1111',
        nome: 'Nubank',
        banco: 'Nubank',
        limiteCredito: 1000,
        diaFechamento: 8,
        diaVencimento: 15
      }
    ]);
  }

  it('deve criar componente e montar eventos do dia selecionado', () => {
    fixture.detectChanges();
    setMonthAndSeedData();
    fixture.detectChanges();

    const events = component.visibleEvents;
    expect(events.length).toBe(3);
    expect(events.map((e) => e.type)).toEqual(['expense', 'card-due', 'income']);
    expect(events[0].title).toContain('Aluguel');
    expect(events[1].title).toContain('Vencimento cartão');
    expect(events[2].title).toContain('Salario');
  });

  it('deve aplicar filtros por tipo no painel do dia', () => {
    fixture.detectChanges();
    setMonthAndSeedData();
    fixture.detectChanges();

    component.showCardDue = false;
    component.showIncomes = false;

    const filtered = component.visibleEvents;
    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe('expense');
  });

  it('deve calcular resumo mensal com receitas, despesas e saldo', () => {
    fixture.detectChanges();
    setMonthAndSeedData();
    fixture.detectChanges();

    expect(component.monthExpenseTotal).toBe(1320);
    expect(component.monthIncomeTotal).toBe(5000);
    expect(component.monthProjectedBalance).toBe(3680);
  });

  it('deve filtrar eventos por categoria e status', () => {
    fixture.detectChanges();
    setMonthAndSeedData();
    fixture.detectChanges();

    component.selectedCategory = 'Moradia';
    component.selectedStatus = 'OPEN';

    const filtered = component.visibleEvents;
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toContain('Aluguel');
    expect(filtered[0].status).toBe('OPEN');
  });

  it('deve sinalizar tipos presentes no dia', () => {
    fixture.detectChanges();
    setMonthAndSeedData();
    fixture.detectChanges();

    const targetCell = component.monthCells.find(
      (cell) => cell.date.getFullYear() === 2026 && cell.date.getMonth() === 2 && cell.date.getDate() === 15
    );

    expect(targetCell).toBeTruthy();
    expect(component.hasTypeInDay(targetCell!, 'expense')).toBeTrue();
    expect(component.hasTypeInDay(targetCell!, 'income')).toBeTrue();
    expect(component.hasTypeInDay(targetCell!, 'card-due')).toBeTrue();
  });

  it('deve navegar entre meses e atualizar seleção', () => {
    fixture.detectChanges();

    component.currentMonth = new Date(2026, 2, 1);
    component.selectedDate = new Date(2026, 2, 10);

    component.nextMonth();
    expect(component.currentMonth.getMonth()).toBe(3);
    expect(component.selectedDate.getMonth()).toBe(3);
    expect(component.selectedDate.getDate()).toBe(1);

    component.previousMonth();
    expect(component.currentMonth.getMonth()).toBe(2);
    expect(component.selectedDate.getMonth()).toBe(2);
    expect(component.selectedDate.getDate()).toBe(1);
  });

  it('deve trocar mês ao selecionar uma célula de outro mês', () => {
    fixture.detectChanges();

    component.currentMonth = new Date(2026, 2, 1);
    component.selectedDate = new Date(2026, 2, 10);

    component.selectDate(new Date(2026, 3, 2));

    expect(component.currentMonth.getMonth()).toBe(3);
    expect(component.selectedDate.getMonth()).toBe(3);
    expect(component.selectedDate.getDate()).toBe(2);
  });
});
