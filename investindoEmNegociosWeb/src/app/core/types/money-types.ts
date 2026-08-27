// MoneyType e ScheduleType usam os nomes dos enums do backend (.NET PascalCase).
export type MoneyType = 'Income' | 'Expense';
export type ScheduleType = 'OneTime' | 'Installments' | 'Recurring';

// InstallmentStatus é UPPER_SNAKE no frontend — NÃO é o formato do backend (PascalCase, ex.:
// "PartiallyPaid"). Sempre converta o valor cru vindo da API com toInstallmentStatus().
export type InstallmentStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELED' | 'ANTICIPATED';

const INSTALLMENT_STATUSES: readonly InstallmentStatus[] = [
  'OPEN',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELED',
  'ANTICIPATED'
];

/**
 * Normaliza o status de parcela vindo do backend (enum .NET PascalCase, ex.: "PartiallyPaid")
 * para o UPPER_SNAKE usado no frontend ("PARTIALLY_PAID"). Um `.toUpperCase()` simples quebraria
 * "PartiallyPaid" → "PARTIALLYPAID" (sem underscore). Idempotente para valores já normalizados;
 * cai em 'OPEN' para vazio/desconhecido.
 */
export function toInstallmentStatus(raw: string | null | undefined): InstallmentStatus {
  const normalized = (raw ?? '')
    .toString()
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
  return (INSTALLMENT_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as InstallmentStatus)
    : 'OPEN';
}
