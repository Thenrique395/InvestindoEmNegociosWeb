export type AccountType = 'Checking' | 'Savings' | 'DigitalWallet' | 'Cash' | 'Other';
export type AccountTransactionKind = 'Credit' | 'Debit';
export type AccountTransactionType = 'Income' | 'Expense' | 'Transfer';

export interface AccountRequest {
  name: string;
  type: AccountType;
  initialBalance: number;
  isActive: boolean;
}

export interface AccountResponse {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalanceResponse {
  accountId: string;
  initialBalance: number;
  transactionsNet: number;
  currentBalance: number;
}

export interface AccountTransactionResponse {
  id: string;
  accountId: string;
  occurredAt: string;
  type: AccountTransactionType;
  kind: AccountTransactionKind;
  amount: number;
  description: string;
  sourceType?: string | null;
  sourceGroup?: string | null;
  sourceLabel?: string | null;
  sourceId?: string | null;
  createdAt: string;
}

export interface AccountTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  occurredAt?: string | null;
  description?: string | null;
}

export interface AccountTransferResponse {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  occurredAtUtc: string;
  description: string;
}
