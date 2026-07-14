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
    create: jasmine.createSpy('create'),
    update: jasmine.createSpy('update'),
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
    { canViewCardStatements: () => true } as any,
    { markForCheck: jasmine.createSpy('markForCheck') } as any,
    { onDestroy: () => {} } as any
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

  it('deriva cards() e cardMetrics do CardsStore (reativo — trava regressão do bug de exibição)', () => {
    const cardDto = {
      id: 'c1', brandId: 1, holderName: 'FULANO DE TAL', nickname: 'Meu Cartão',
      last4: '1234', bank: 'Banco X', creditLimit: 5000, statementCloseDay: 10, dueDay: 18
    };
    const { component } = buildComponent({ cards: () => [cardDto] });

    expect(component.cards().length).toBe(1);
    expect(component.cards()[0].limiteCredito).toBe(5000);
    expect(component.cards()[0].diaVencimento).toBe(18);
    expect(component.cardMetrics.length).toBe(1);
    expect(component.cardsOverview.activeCards).toBe(1);
    expect(component.totalLimit).toBe(5000);
  });

  it('permite salvar edição mesmo com número mascarado (last4) — trava regressão do bug de edição', () => {
    const cardDto = {
      id: 'c1', brandId: 1, holderName: 'FULANO DE TAL', nickname: 'Meu Cartão',
      last4: '9999', bank: 'Banco X', creditLimit: 5000, statementCloseDay: 10, dueDay: 18
    };
    const { component, cardsStore } = buildComponent({ cards: () => [cardDto] });

    component.editar(component.cards()[0]); // em edição o campo número carrega só o last4 "9999"
    component.limiteCredito = 8000; // usuário altera apenas o limite
    component.salvar();

    expect(cardsStore.update).toHaveBeenCalled();
    const [id, payload] = cardsStore.update.calls.mostRecent().args;
    expect(id).toBe('c1');
    expect(payload.creditLimit).toBe(8000);
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
      { canViewCardStatements: () => true } as any,
      { markForCheck: jasmine.createSpy('markForCheck') } as any,
      { onDestroy: () => {} } as any
    ));

    component.ngOnInit();

    expect(lookupsStore.loadCardBrands).toHaveBeenCalled();
    expect(lookupsStore.loadInstitutions).toHaveBeenCalledWith('Bank');
    expect(cardsStore.load).toHaveBeenCalledWith(undefined, true);
  });
});
