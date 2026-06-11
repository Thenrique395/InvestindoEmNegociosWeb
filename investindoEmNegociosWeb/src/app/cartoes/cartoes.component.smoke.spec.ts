import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CartoesComponent } from './cartoes.component';

function buildComponent(cardsStoreMock: any = {}) {
  const cardsStore = {
    cards: () => [],
    selectedCardId: () => null,
    statementsCardId: () => null,
    statementsLoading: () => false,
    statements: () => [],
    statementsError: () => null,
    load: jasmine.createSpy('load'),
    selectCard: jasmine.createSpy('selectCard'),
    loadStatements: jasmine.createSpy('loadStatements'),
    ...cardsStoreMock
  };
  const component = TestBed.runInInjectionContext(() => new CartoesComponent(
    { cards$: of([]), expenses$: of([]) } as any,
    {
      cardBrands: () => [],
      institutions: () => [],
      loadCardBrands: jasmine.createSpy('loadCardBrands'),
      loadInstitutions: jasmine.createSpy('loadInstitutions')
    } as any,
    cardsStore as any,
    { error: jasmine.createSpy(), success: jasmine.createSpy(), info: jasmine.createSpy() } as any,
    { canViewCardStatements: () => true } as any
  ));

  return { component, cardsStore };
}

describe('CartoesComponent smoke', () => {
  it('deve limpar ciclos quando não há cartão selecionado', () => {
    const { component, cardsStore } = buildComponent();
    component.statementCardId = null;
    component.statementCycles = [{ statementYear: 2026, statementMonth: 3 } as any];

    component.loadStatementCycles();

    expect(component.statementCycles.length).toBe(0);
    expect(cardsStore.selectCard).toHaveBeenCalledWith(null);
  });

  it('deve solicitar ciclos de fatura por competência ao store', () => {
    const { component, cardsStore } = buildComponent();
    component.statementCardId = 'card-1';
    component.statementYear = 2026;
    component.statementMonth = 3;

    component.loadStatementCycles();

    expect(cardsStore.selectCard).toHaveBeenCalledWith('card-1');
    expect(cardsStore.loadStatements).toHaveBeenCalledWith('card-1', { year: 2026, month: 3 });
  });

  it('deve carregar dependências iniciais no init', () => {
    const lookupsStore = {
      cardBrands: () => [],
      institutions: () => [],
      loadCardBrands: jasmine.createSpy('loadCardBrands'),
      loadInstitutions: jasmine.createSpy('loadInstitutions')
    };
    const cardsStore = {
      cards: () => [],
      selectedCardId: () => null,
      statementsCardId: () => null,
      statementsLoading: () => false,
      statements: () => [],
      statementsError: () => null,
      load: jasmine.createSpy('load'),
      selectCard: jasmine.createSpy('selectCard'),
      loadStatements: jasmine.createSpy('loadStatements')
    };
    const component = TestBed.runInInjectionContext(() => new CartoesComponent(
      { cards$: of([]), expenses$: of([]) } as any,
      lookupsStore as any,
      cardsStore as any,
      { error: jasmine.createSpy(), success: jasmine.createSpy(), info: jasmine.createSpy() } as any,
      { canViewCardStatements: () => true } as any
    ));

    component.ngOnInit();

    expect(lookupsStore.loadCardBrands).toHaveBeenCalled();
    expect(lookupsStore.loadInstitutions).toHaveBeenCalledWith('Bank');
    expect(cardsStore.load).toHaveBeenCalledWith(undefined, true);
  });
});
