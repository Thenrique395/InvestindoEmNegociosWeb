/**
 * Limiares de cor — COMPONENTES.md §9 e ARQUITETURA_ANGULAR.md §9.1.
 *
 * Existem **duas** semânticas, e confundi-las inverte a leitura da tela:
 *
 * - **consumo** (orçamento, limite de cartão, meta de despesa): passar é ruim.
 *   Verde até 80%, atenção entre 80 e 100, vermelho acima de 100.
 * - **conquista** (meta de receita, meta de aporte): chegar é bom.
 *   Verde ao atingir 100, azul enquanto está em ritmo, atenção fora de ritmo.
 *
 * Moram aqui, e não em cada tela, para que mudar "atenção" de 80% para 75%
 * seja uma edição em um lugar só.
 */

export type ProgressMode = 'consumo' | 'conquista';
export type ProgressTone = 'income' | 'primary' | 'warning' | 'expense';

export const LIMIAR_ATENCAO = 80;
export const LIMIAR_ESTOURO = 100;

/** Percentual consumido (pode passar de 100). */
export function toneForConsumo(percent: number): ProgressTone {
  if (percent > LIMIAR_ESTOURO) return 'expense';
  if (percent >= LIMIAR_ATENCAO) return 'warning';
  return 'income';
}

/**
 * `onTrack` diz se o ritmo alcança o prazo. Sem essa informação, tratamos
 * qualquer progresso abaixo de 100% como "em ritmo" — é o comportamento
 * neutro, e não acusa o usuário de atraso que talvez não exista.
 */
export function toneForConquista(percent: number, onTrack = true): ProgressTone {
  if (percent >= LIMIAR_ESTOURO) return 'income';
  return onTrack ? 'primary' : 'warning';
}

export function toneFor(mode: ProgressMode, percent: number, onTrack = true): ProgressTone {
  return mode === 'consumo' ? toneForConsumo(percent) : toneForConquista(percent, onTrack);
}
