import { TransactionSummaryTone } from '../../shared/transactions/transaction-summary-card.component';

/**
 * Derivações puras do contexto do assistente. Mapeia o score de risco real
 * (0–100) para o tom do card. Não inventa dados.
 */

export function assistantRiskTone(score: number): TransactionSummaryTone {
  const value = Number(score || 0);
  if (value > 66) return 'danger';
  if (value > 33) return 'warning';
  return 'success';
}
