import { StatusBadgeTone } from '../shared/status-badge/status-badge.component';
import { TransactionSummaryTone } from '../shared/transactions/transaction-summary-card.component';

/**
 * Derivações puras do monitor de robôs. Mapeia o resultado real de cada
 * execução (sucesso/pulado) e a taxa de sucesso para rótulos e tons.
 */

export function runStatusLabel(success: boolean, wasSkipped: boolean): string {
  if (wasSkipped) return 'Pulado';
  return success ? 'Sucesso' : 'Falha';
}

export function runStatusTone(success: boolean, wasSkipped: boolean): StatusBadgeTone {
  if (wasSkipped) return 'warning';
  return success ? 'success' : 'danger';
}

export function successRateTone(percent: number): TransactionSummaryTone {
  const value = Number(percent || 0);
  if (value >= 90) return 'success';
  if (value >= 70) return 'warning';
  return 'danger';
}
