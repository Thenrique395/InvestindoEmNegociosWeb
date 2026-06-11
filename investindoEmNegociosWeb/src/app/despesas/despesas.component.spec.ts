import { DespesasComponent } from './despesas.component';
import { StoredCard, StoredExpense } from '../data/api-data.service';

function createComponent(): DespesasComponent {
  return new DespesasComponent(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { getRole: () => null } as any,
    {} as any,
    { canImportInvoices: () => true } as any
  );
}

function baseExpense(overrides: Partial<StoredExpense> = {}): StoredExpense {
  return {
    id: 'exp-1',
    nome: 'Despesa teste',
    categoria: 'Categoria',
    valor: 100,
    vencimento: '10/02/2026',
    ...overrides
  };
}

describe('DespesasComponent - competência de cartão no front', () => {
  it('deve exibir "À vista" quando a despesa não tem cartão', () => {
    const component = createComponent();
    const label = component.pagamentoLabel(baseExpense({ cartao: undefined }));
    expect(label).toBe('À vista');
  });

  it('deve exibir fatura MM/AAAA quando statementMonth e statementYear estiverem preenchidos', () => {
    const component = createComponent();
    const card: StoredCard = {
      id: 'card-1',
      bandeira: '1',
      numero: '1234567890123456',
      nome: 'Cartão principal',
      limiteCredito: 1000,
      diaFechamento: 10,
      diaVencimento: 15
    };
    component.cartoes = [card];
    component.cardBrandMap = { '1': 'VISA' };

    const label = component.pagamentoLabel(
      baseExpense({
        cartao: 'card-1',
        statementMonth: 3,
        statementYear: 2026
      })
    );

    expect(label).toContain('Cartão - VISA - 1234 *********** 3456');
    expect(label).toContain('Fatura 03/2026');
  });

  it('deve exibir apenas o cartão quando não houver competência preenchida', () => {
    const component = createComponent();
    const card: StoredCard = {
      id: 'card-1',
      bandeira: '1',
      numero: '1234567890123456',
      nome: 'Cartão principal',
      limiteCredito: 1000,
      diaFechamento: 10,
      diaVencimento: 15
    };
    component.cartoes = [card];
    component.cardBrandMap = { '1': 'VISA' };

    const label = component.pagamentoLabel(
      baseExpense({
        cartao: 'card-1',
        statementMonth: null,
        statementYear: null
      })
    );

    expect(label).toBe('Cartão - VISA - 1234 *********** 3456');
  });
});
