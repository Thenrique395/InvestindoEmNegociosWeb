import {
  accountTypeLabel,
  brToIso,
  createExpenseDraft,
  createIncomeDraft,
  isoToBr,
  maskPhone,
  toStoredCard
} from './onboarding.helpers';

describe('onboarding helpers', () => {
  it('formata labels de tipos de conta', () => {
    expect(accountTypeLabel('Checking')).toBe('Conta corrente');
    expect(accountTypeLabel('Savings')).toBe('Poupança');
    expect(accountTypeLabel('DigitalWallet')).toBe('Carteira digital');
    expect(accountTypeLabel('Cash')).toBe('Dinheiro');
    expect(accountTypeLabel('Other')).toBe('Outro');
  });

  it('cria drafts vazios para receita e despesa', () => {
    expect(createIncomeDraft()).toEqual({
      id: '',
      fonte: '',
      categoria: '',
      categoryId: null,
      valor: 0,
      recebimento: '',
      fixa: false
    });
    expect(createExpenseDraft()).toEqual({
      id: '',
      nome: '',
      categoria: '',
      categoryId: null,
      valor: 0,
      vencimento: ''
    });
  });

  it('mascara telefone', () => {
    expect(maskPhone('81995257823')).toBe('(81) 99525-7823');
    expect(maskPhone('81')).toBe('(81');
  });

  it('mascara telefone fixo (10) e celular (11) — #2', () => {
    expect(maskPhone('8133334444')).toBe('(81) 3333-4444'); // fixo: 4+4
    expect(maskPhone('81933334444')).toBe('(81) 93333-4444'); // celular: 5+4
  });

  it('converte datas entre BR e ISO', () => {
    expect(brToIso('02/03/1991', '2026-06-04')).toBe('1991-03-02');
    expect(brToIso('', '2026-06-04')).toBe('2026-06-04');
    expect(isoToBr('1991-03-02')).toBe('02/03/1991');
    expect(isoToBr('')).toBe('');
  });

  it('brToIso: exige DDMMYYYY completo (senão fallback), evitando ISO malformado', () => {
    expect(brToIso('05/08/2026', '2026-01-01')).toBe('2026-08-05');
    expect(brToIso('5/8/26', '2026-01-01')).toBe('2026-01-01'); // incompleto -> fallback
    expect(brToIso('abc', '2026-01-01')).toBe('2026-01-01');
  });

  it('converte cartao da API para modelo de tela', () => {
    expect(toStoredCard({
      id: 'card-1',
      brandId: 2,
      holderName: 'Henrique Santos',
      nickname: '',
      last4: '1234',
      bank: null,
      creditLimit: 5000,
      statementCloseDay: 10,
      dueDay: 18,
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z'
    })).toEqual({
      id: 'card-1',
      bandeira: '2',
      numero: '1234',
      nome: 'Henrique Santos',
      banco: '',
      limiteCredito: 5000,
      diaFechamento: 10,
      diaVencimento: 18
    });
  });
});
