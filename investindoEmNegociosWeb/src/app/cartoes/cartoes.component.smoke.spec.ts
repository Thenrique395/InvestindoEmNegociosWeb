import { of, throwError } from 'rxjs';
import { CartoesComponent } from './cartoes.component';
import { CardsService } from '../cards.service';

function buildComponent(cardsServiceMock: Partial<CardsService>) {
  return new CartoesComponent(
    { cards$: of([]), expenses$: of([]) } as any,
    { cardBrands: () => of([]), institutions: () => of([]) } as any,
    { error: jasmine.createSpy(), success: jasmine.createSpy(), info: jasmine.createSpy() } as any,
    cardsServiceMock as CardsService
  );
}

describe('CartoesComponent smoke', () => {
  it('deve limpar ciclos quando não há cartão selecionado', () => {
    const component = buildComponent({ statements: jasmine.createSpy().and.returnValue(of([])) });
    component.statementCardId = null;
    component.statementCycles = [{ statementYear: 2026, statementMonth: 3 } as any];

    component.loadStatementCycles();

    expect(component.statementCycles.length).toBe(0);
  });

  it('deve carregar ciclos de fatura por competência', () => {
    const statements = jasmine.createSpy().and.returnValue(
      of([
        {
          statementYear: 2026,
          statementMonth: 3,
          statementCloseDate: '2026-03-10',
          statementDueDate: '2026-03-15',
          totalAmount: 500,
          totalPaid: 200,
          totalOpen: 300,
          itemsCount: 1,
          items: []
        }
      ])
    );
    const component = buildComponent({ statements } as any);
    component.statementCardId = 'card-1';
    component.statementYear = 2026;
    component.statementMonth = 3;

    component.loadStatementCycles();

    expect(statements).toHaveBeenCalledWith('card-1', { year: 2026, month: 3 });
    expect(component.statementCycles.length).toBe(1);
    expect(component.statementCycles[0].totalOpen).toBe(300);
  });

  it('deve tratar erro ao carregar ciclos', () => {
    const statements = jasmine.createSpy().and.returnValue(throwError(() => new Error('boom')));
    const ui = { error: jasmine.createSpy(), success: jasmine.createSpy(), info: jasmine.createSpy() };
    const component = new CartoesComponent(
      { cards$: of([]), expenses$: of([]) } as any,
      { cardBrands: () => of([]), institutions: () => of([]) } as any,
      ui as any,
      { statements } as any
    );
    component.statementCardId = 'card-1';

    component.loadStatementCycles();

    expect(component.statementCycles.length).toBe(0);
    expect(ui.error).toHaveBeenCalled();
  });
});
