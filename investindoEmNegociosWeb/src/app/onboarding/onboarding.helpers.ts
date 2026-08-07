import { AccountType } from '../accounts.service';
import { StoredCard, StoredExpense, StoredIncome } from '../data/api-data.service';
import { CardDto } from '../cards.service';

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

export function toStoredCard(card: CardDto): StoredCard {
  return {
    id: card.id,
    bandeira: String(card.brandId),
    numero: card.last4,
    nome: card.nickname || card.holderName,
    banco: card.bank || '',
    limiteCredito: card.creditLimit ?? 0,
    diaFechamento: card.statementCloseDay ?? 1,
    diaVencimento: card.dueDay ?? 1
  };
}
