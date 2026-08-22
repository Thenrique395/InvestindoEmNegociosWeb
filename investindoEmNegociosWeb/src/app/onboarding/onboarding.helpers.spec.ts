import { AbstractControl } from '@angular/forms';
import {
  accountTypeLabel,
  brToIso,
  createExpenseDraft,
  createIncomeDraft,
  isoToBr,
  maskPhone,
  onboardingProfileFieldError,
  toStoredCard
} from './onboarding.helpers';

function ctrlStub(errors: Record<string, unknown> | null, touched = true): AbstractControl {
  return { errors, touched } as unknown as AbstractControl;
}

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

  it('onboardingProfileFieldError: null quando não tocado, sem erros ou control ausente', () => {
    expect(onboardingProfileFieldError('fullName', null)).toBeNull();
    expect(onboardingProfileFieldError('fullName', ctrlStub(null))).toBeNull();
    expect(onboardingProfileFieldError('fullName', ctrlStub({ required: true }, false))).toBeNull();
  });

  it('onboardingProfileFieldError: mensagens por campo e por tipo de erro', () => {
    expect(onboardingProfileFieldError('document', ctrlStub({ required: true }))).toBe('Informe seu CPF.');
    expect(onboardingProfileFieldError('city', ctrlStub({ blank: true }))).toBe('Informe sua cidade.');
    expect(onboardingProfileFieldError('fullName', ctrlStub({ minlength: {} }))).toBe('Mínimo de 3 caracteres.');
    expect(onboardingProfileFieldError('state', ctrlStub({ minlength: {} }))).toBe('Use 2 letras (UF).');
    expect(onboardingProfileFieldError('state', ctrlStub({ maxlength: {} }))).toBe('Use 2 letras (UF).');
    expect(onboardingProfileFieldError('document', ctrlStub({ cpf: true }))).toBe('CPF inválido.');
    expect(onboardingProfileFieldError('phone', ctrlStub({ phone: true }))).toBe('Use o formato (81) 99525-7823.');
    expect(onboardingProfileFieldError('birthDate', ctrlStub({ birthDateRange: true }))).toBe('Informe uma data válida entre 01/01/1900 e hoje.');
    expect(onboardingProfileFieldError('country', ctrlStub({ someUnknown: true }))).toBe('Campo inválido.');
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
      holderName: 'Henrique Santos',
      banco: '',
      limiteCredito: 5000,
      diaFechamento: 10,
      diaVencimento: 18
    });
  });
});
