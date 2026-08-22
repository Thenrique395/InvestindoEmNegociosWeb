export type AttentionTone = 'danger' | 'warning' | 'info';

export interface AttentionItem {
  id: string;
  tone: AttentionTone;
  /** Frase curta: o que está acontecendo. */
  title: string;
  /** Valor e recorte, embaixo do título. */
  detail: string;
  actionLabel: string;
  route: string;
  queryParams?: Record<string, string>;
}

/** Os números crus que o dashboard já apura sobre pendências. */
export interface AttentionInput {
  despesasEmAtraso: { quantidade: number; valor: number; diasDoMaisAntigo: number | null };
  despesasProximas: { quantidade: number; valor: number };
  receitasAtrasadas: { quantidade: number; valor: number };
  faturasFechando: { quantidade: number; valor: number };
}

/**
 * "Precisa da sua atenção" — TELAS.md §1.
 *
 * A ordem é a da urgência, não a do código: o que já venceu vem antes do que
 * vai vencer, e dinheiro que sai antes de dinheiro que entra. Card vazio é
 * resultado legítimo — significa que não há pendência exigindo ação hoje.
 */
export function buildAttentionItems(input: AttentionInput, fmt: (value: number) => string): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (input.despesasEmAtraso.quantidade > 0) {
    items.push({
      id: 'despesas-atrasadas',
      tone: 'danger',
      title: `${plural(input.despesasEmAtraso.quantidade, 'despesa vencida', 'despesas vencidas')}`,
      detail: [fmt(input.despesasEmAtraso.valor), atrasoLabel(input.despesasEmAtraso.diasDoMaisAntigo)]
        .filter(Boolean)
        .join(' · '),
      actionLabel: 'Pagar',
      route: '/despesas',
      queryParams: { focus: 'overdue' }
    });
  }

  if (input.faturasFechando.quantidade > 0) {
    items.push({
      id: 'faturas-fechando',
      tone: 'warning',
      title: `${plural(input.faturasFechando.quantidade, 'fatura fecha', 'faturas fecham')} nos próximos dias`,
      detail: `${fmt(input.faturasFechando.valor)} · cartões`,
      actionLabel: 'Ver',
      route: '/cartoes'
    });
  }

  if (input.despesasProximas.quantidade > 0) {
    items.push({
      id: 'despesas-proximas',
      tone: 'warning',
      title: `${plural(input.despesasProximas.quantidade, 'conta vence', 'contas vencem')} em até 7 dias`,
      detail: fmt(input.despesasProximas.valor),
      actionLabel: 'Ver',
      route: '/despesas',
      queryParams: { focus: 'upcoming' }
    });
  }

  if (input.receitasAtrasadas.quantidade > 0) {
    items.push({
      id: 'receitas-atrasadas',
      tone: 'info',
      title: `${plural(input.receitasAtrasadas.quantidade, 'receita não caiu', 'receitas não caíram')}`,
      detail: `${fmt(input.receitasAtrasadas.valor)} · previstas para o período`,
      actionLabel: 'Ver',
      route: '/receitas',
      queryParams: { focus: 'pending' }
    });
  }

  return items;
}

function plural(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

function atrasoLabel(dias: number | null): string {
  if (dias === null || dias <= 0) {
    return 'vence hoje';
  }
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}
