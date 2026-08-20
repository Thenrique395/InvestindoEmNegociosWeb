/**
 * Textos do diálogo de exclusão de lançamento.
 *
 * Ficam aqui, e não no componente, porque a pergunta muda conforme o que se
 * está excluindo — e cada combinação tem um título, uma explicação, duas opções
 * e um rótulo de botão próprios. Errar um par (dizer "recorrência" para uma
 * série de parcelas) faz a pessoa apagar o que não queria.
 *
 * Fonte: protótipo `Despesas-e-Receitas.dc.html`, estado `confirmar`.
 */

/** O que a exclusão alcança. */
export type DeleteScope = 'single' | 'all';

/** Natureza do lançamento que está sendo excluído. */
export type DeleteKind = 'single' | 'series' | 'recurring';

/** Substantivo usado nas frases — Despesas e Receitas compartilham o diálogo. */
export type DeleteNoun = 'despesa' | 'receita';

export interface DeleteScopeOption {
  readonly key: DeleteScope;
  readonly label: string;
  readonly note: string;
}

export interface DeleteConfirmView {
  readonly title: string;
  readonly note: string;
  /** Vazio para lançamento simples: não há escopo a escolher. */
  readonly options: readonly DeleteScopeOption[];
}

export function buildDeleteConfirmView(kind: DeleteKind, noun: DeleteNoun): DeleteConfirmView {
  if (kind === 'series') {
    return {
      title: 'Excluir parcela ou série?',
      note: `Esta ${noun} faz parte de uma série de parcelas. Escolha se quer excluir apenas esta parcela ou todas as parcelas da série.`,
      options: [
        { key: 'single', label: 'Somente esta parcela', note: 'As demais parcelas da série permanecem.' },
        { key: 'all', label: 'Todas as parcelas', note: 'Remove a série inteira, incluindo as já pagas.' }
      ]
    };
  }

  if (kind === 'recurring') {
    return {
      title: 'Excluir este mês ou a recorrência?',
      note: `Esta ${noun} é recorrente. Escolha se quer excluir apenas o lançamento deste mês ou encerrar a recorrência.`,
      options: [
        { key: 'single', label: 'Somente este mês', note: 'Os próximos meses continuam sendo gerados.' },
        { key: 'all', label: 'Encerrar recorrência', note: 'Remove este e todos os lançamentos futuros.' }
      ]
    };
  }

  return {
    title: 'Excluir lançamento?',
    note: 'Essa ação não pode ser desfeita.',
    options: []
  };
}

/** Rótulo do botão destrutivo: diz o que vai acontecer, não "Confirmar". */
export function deleteConfirmCta(kind: DeleteKind, scope: DeleteScope): string {
  if (kind === 'single') return 'Excluir';
  if (scope === 'single') return 'Excluir apenas esta';
  return kind === 'recurring' ? 'Encerrar recorrência' : 'Excluir série';
}
