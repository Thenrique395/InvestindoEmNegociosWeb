import { AbstractControl } from '@angular/forms';
import { AccountType } from '../accounts.service';
import { StoredExpense, StoredIncome } from '../data/api-data.service';

export type OnboardingProfileField =
  | 'fullName'
  | 'document'
  | 'phone'
  | 'birthDate'
  | 'city'
  | 'state'
  | 'country';

/**
 * Mensagem de erro do campo de perfil, ou null quando não há erro a exibir
 * (campo não tocado ou válido). Função pura para ser compartilhada entre o
 * OnboardingComponent e o ProfileStepComponent e coberta por testes.
 */
export function onboardingProfileFieldError(
  control: OnboardingProfileField,
  ctrl: AbstractControl | null
): string | null {
  if (!ctrl || !ctrl.touched || !ctrl.errors) return null;

  if (ctrl.errors['required']) {
    switch (control) {
      case 'fullName': return 'Informe seu nome.';
      case 'document': return 'Informe seu CPF.';
      case 'phone': return 'Informe seu telefone.';
      case 'birthDate': return 'Informe sua data de nascimento.';
      case 'city': return 'Informe sua cidade.';
      case 'state': return 'Informe seu estado.';
      case 'country': return 'Informe seu país.';
    }
  }

  if (ctrl.errors['blank']) {
    switch (control) {
      case 'fullName': return 'Informe seu nome.';
      case 'city': return 'Informe sua cidade.';
      case 'state': return 'Informe seu estado.';
      case 'country': return 'Informe seu país.';
    }
  }

  if (ctrl.errors['minlength']) {
    if (control === 'fullName') return 'Mínimo de 3 caracteres.';
    if (control === 'state') return 'Use 2 letras (UF).';
  }

  if (ctrl.errors['maxlength'] && control === 'state') {
    return 'Use 2 letras (UF).';
  }

  if (ctrl.errors['cpf']) return 'CPF inválido.';
  if (ctrl.errors['phone']) return 'Use o formato (81) 99525-7823.';
  if (ctrl.errors['birthDateRange']) return 'Informe uma data válida entre 01/01/1900 e hoje.';

  return 'Campo inválido.';
}

export function accountTypeLabel(type: AccountType): string {
  switch (type) {
    case 'Checking': return 'Conta corrente';
    case 'Savings': return 'Poupança';
    case 'DigitalWallet': return 'Carteira digital';
    case 'Cash': return 'Dinheiro';
    default: return 'Outro';
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createIncomeDraft(): StoredIncome {
  return {
    id: '',
    fonte: '',
    categoria: '',
    categoryId: null,
    valor: 0,
    recebimento: '',
    fixa: false
  };
}

export function createExpenseDraft(): StoredExpense {
  return {
    id: '',
    nome: '',
    categoria: '',
    categoryId: null,
    valor: 0,
    vencimento: ''
  };
}

export function maskPhone(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  const ddd = digits.slice(0, 2);
  if (digits.length <= 2) return `(${ddd}`;
  const rest = digits.slice(2);
  // Celular (11 dígitos): 5+4. Fixo/incompleto (até 10): 4+4.
  const firstLen = digits.length === 11 ? 5 : 4;
  const first = rest.slice(0, firstLen);
  const second = rest.slice(firstLen);
  return second ? `(${ddd}) ${first}-${second}` : `(${ddd}) ${first}`;
}

export function brToIso(value: string, fallbackIso = todayIso()): string {
  // Baseado nos dígitos (tolera entrada sem zero à esquerda) e exige DDMMYYYY completos;
  // caso contrário devolve o fallback em vez de gerar um ISO malformado.
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length !== 8) return fallbackIso;
  return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

export function isoToBr(value: string): string {
  const [yyyy, mm, dd] = (value || '').split('-');
  if (!yyyy || !mm || !dd) return '';
  return `${dd}/${mm}/${yyyy}`;
}

export { toStoredCard } from '../cartoes/card.mapper';
