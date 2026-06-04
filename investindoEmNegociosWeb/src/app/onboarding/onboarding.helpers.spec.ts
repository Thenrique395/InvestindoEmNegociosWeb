import {
  accountTypeLabel,
  brToIso,
  createExpenseDraft,
  createIncomeDraft,
  isoToBr,
  maskCpf,
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

  it('mascara cpf e telefone', () => {
    expect(maskCpf('01587610493')).toBe('015.876.104-93');
    expect(maskCpf('01587610493000')).toBe('015.876.104-93');
    expect(maskPhone('81995257823')).toBe('(81) 99525-7823');
    expect(maskPhone('81')).toBe('(81');
  });

  it('converte datas entre BR e ISO', () => {
    expect(brToIso('02/03/1991', '2026-06-04')).toBe('1991-03-02');
    expect(brToIso('', '2026-06-04')).toBe('2026-06-04');
    expect(isoToBr('1991-03-02')).toBe('02/03/1991');
    expect(isoToBr('')).toBe('');
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
