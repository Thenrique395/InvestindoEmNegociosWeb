import { AttentionInput, buildAttentionItems } from './attention-card.model';

const fmt = (v: number) => `R$ ${v}`;

function base(overrides: Partial<AttentionInput> = {}): AttentionInput {
  return {
    despesasEmAtraso: { quantidade: 0, valor: 0, diasDoMaisAntigo: null },
    despesasProximas: { quantidade: 0, valor: 0 },
    receitasAtrasadas: { quantidade: 0, valor: 0 },
    faturasFechando: { quantidade: 0, valor: 0 },
    ...overrides
  };
}

describe('attention-card.model', () => {
  it('sem pendência, não inventa item — card vazio é resultado legítimo', () => {
    expect(buildAttentionItems(base(), fmt)).toEqual([]);
  });

  it('ordena por urgência: o que venceu antes do que vai vencer', () => {
    const items = buildAttentionItems(
      base({
        despesasEmAtraso: { quantidade: 1, valor: 892, diasDoMaisAntigo: 3 },
        despesasProximas: { quantidade: 2, valor: 2160 },
        receitasAtrasadas: { quantidade: 1, valor: 1200 }
      }),
      fmt
    );
    expect(items.map((i) => i.id)).toEqual(['despesas-atrasadas', 'despesas-proximas', 'receitas-atrasadas']);
  });

  it('despesa vencida leva tom de despesa e ação de pagar', () => {
    const item = buildAttentionItems(
      base({ despesasEmAtraso: { quantidade: 2, valor: 892, diasDoMaisAntigo: 3 } }),
      fmt
    )[0];
    expect(item.tone).toBe('danger');
    expect(item.title).toBe('2 despesas vencidas');
    expect(item.detail).toBe('R$ 892 · há 3 dias');
    expect(item.actionLabel).toBe('Pagar');
    expect(item.route).toBe('/despesas');
    expect(item.queryParams).toEqual({ focus: 'overdue' });
  });

  it('concorda em número: uma despesa não vira "1 despesas"', () => {
    const um = buildAttentionItems(base({ despesasProximas: { quantidade: 1, valor: 10 } }), fmt)[0];
    const varios = buildAttentionItems(base({ despesasProximas: { quantidade: 3, valor: 10 } }), fmt)[0];
    expect(um.title).toBe('1 conta vence em até 7 dias');
    expect(varios.title).toBe('3 contas vencem em até 7 dias');
  });

  it('atraso de zero dia lê "vence hoje", não "há 0 dias"', () => {
    const item = buildAttentionItems(
      base({ despesasEmAtraso: { quantidade: 1, valor: 50, diasDoMaisAntigo: 0 } }),
      fmt
    )[0];
    expect(item.detail).toContain('vence hoje');
  });
});
