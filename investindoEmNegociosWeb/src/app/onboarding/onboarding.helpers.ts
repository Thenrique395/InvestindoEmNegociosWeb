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
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function brToIso(value: string, fallbackIso = todayIso()): string {
  const [dd, mm, yyyy] = value.split('/');
  if (!dd || !mm || !yyyy) return fallbackIso;
  return `${yyyy}-${mm}-${dd}`;
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
