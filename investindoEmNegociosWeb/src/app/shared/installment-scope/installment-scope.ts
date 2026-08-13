/**
 * Alcance de uma ação sobre lançamento parcelado.
 *
 * Regra que atravessa Despesas, Cartões e Calendário (TELAS.md §3 e
 * ARQUITETURA_ANGULAR.md §9.2): ao editar ou dar baixa em um lançamento
 * parcelado, o sistema **pergunta** se a ação vale só para esta parcela ou para
 * todas as seguintes. Implementado uma vez, em `shared/`.
 */
export type InstallmentScope = 'single' | 'forward';

export interface InstallmentContext {
  /** Número da parcela atual, base 1. */
  current: number;
  total: number;
  description: string;
}

/**
 * Quantas parcelas a escolha atinge. Serve para o modal dizer ao usuário o
 * tamanho da ação antes de confirmar — "esta e as outras 9", não "todas".
 */
export function affectedCount(context: InstallmentContext, scope: InstallmentScope): number {
  if (scope === 'single') return 1;
  return Math.max(1, context.total - context.current + 1);
}

/** Só faz sentido perguntar quando há parcela seguinte. */
export function shouldAskScope(context: InstallmentContext | null): boolean {
  if (!context) return false;
  return context.total > 1 && context.current < context.total;
}
