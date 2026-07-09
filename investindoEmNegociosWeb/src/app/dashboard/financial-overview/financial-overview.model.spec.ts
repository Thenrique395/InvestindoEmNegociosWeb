import {
  buildOverviewCards,
  buildOverviewSummary,
  FinancialOverviewInput,
  planoComercialLabel
} from './financial-overview.model';

const fmt = (value: number) => `R$ ${value.toFixed(2)}`;

function baseInput(overrides: Partial<FinancialOverviewInput> = {}): FinancialOverviewInput {
  return {
    saldoPeriodo: 500,
    saldoDisponivel: 1200,
    saldoEmContas: 2000,
    pendencias: 800,
    saldoProjetado: 1500,
    receitas: { total: 3000, pendentes: 200, anterior: null },
    despesas: { total: 1800, anterior: null },
    patrimonio: { liquido: 10000, ativos: 12000, passivos: 2000, investimentos: 5000, delta: null },
    compromissos: { emAtraso: 0, proximosSeteDias: 0, valorEmAberto: 0, dividaCartoes: 0, temCartoes: false },
    saude: null,
    ...overrides
  };
}

describe('financial-overview.model', () => {
  describe('planoComercialLabel', () => {
    it('mapeia roles internos para nomes comerciais', () => {
      expect(planoComercialLabel('Basic')).toBe('Essencial');
      expect(planoComercialLabel('Intermediate')).toBe('Inteligente');
      expect(planoComercialLabel('Advanced')).toBe('Completo');
      expect(planoComercialLabel('Admin')).toBe('Completo');
      expect(planoComercialLabel(null)).toBe('Essencial');
    });
  });

  describe('buildOverviewCards — regras por plano', () => {
    it('Basic vê apenas saldo, receitas, despesas e compromissos', () => {
      const ids = buildOverviewCards(baseInput(), 'Basic', 'month', fmt).map((c) => c.id);
      expect(ids).toEqual(['saldo', 'receitas', 'despesas', 'compromissos']);
    });

    it('Intermediate ganha patrimônio e saúde financeira', () => {
      const ids = buildOverviewCards(baseInput(), 'Intermediate', 'month', fmt).map((c) => c.id);
      expect(ids).toEqual(['saldo', 'patrimonio', 'receitas', 'despesas', 'compromissos', 'saude']);
    });

    it('Basic usa saldo do período; Intermediate usa saldo disponível real', () => {
      const basic = buildOverviewCards(baseInput(), 'Basic', 'month', fmt).find((c) => c.id === 'saldo')!;
      const inter = buildOverviewCards(baseInput(), 'Intermediate', 'month', fmt).find((c) => c.id === 'saldo')!;
      expect(basic.value).toBe(fmt(500));
      expect(inter.value).toBe(fmt(1200));
    });
  });

  describe('buildOverviewCards — comparativos', () => {
    it('oculta comparativo quando não há dados do período anterior', () => {
      const cards = buildOverviewCards(baseInput(), 'Basic', 'month', fmt);
      expect(cards.find((c) => c.id === 'receitas')!.delta).toBeNull();
      expect(cards.find((c) => c.id === 'despesas')!.delta).toBeNull();
    });

    it('mostra variação percentual com rótulo do período selecionado', () => {
      const input = baseInput({ despesas: { total: 1800, anterior: 2000 } });
      const card = buildOverviewCards(input, 'Basic', 'quarter', fmt).find((c) => c.id === 'despesas')!;
      expect(card.delta).not.toBeNull();
      expect(card.delta!.direction).toBe('down');
      expect(card.delta!.favorable).toBeTrue();
      expect(card.delta!.text).toContain('10%');
      expect(card.delta!.text).toContain('vs. trimestre anterior');
    });

    it('queda de receitas é desfavorável; alta é favorável', () => {
      const down = buildOverviewCards(baseInput({ receitas: { total: 900, pendentes: 0, anterior: 1000 } }), 'Basic', 'month', fmt);
      expect(down.find((c) => c.id === 'receitas')!.delta!.favorable).toBeFalse();

      const up = buildOverviewCards(baseInput({ receitas: { total: 1100, pendentes: 0, anterior: 1000 } }), 'Basic', 'month', fmt);
      expect(up.find((c) => c.id === 'receitas')!.delta!.favorable).toBeTrue();
    });
  });

  describe('buildOverviewCards — compromissos financeiros', () => {
    it('sem compromissos mostra estado positivo sem valores falsos', () => {
      const card = buildOverviewCards(baseInput(), 'Basic', 'month', fmt).find((c) => c.id === 'compromissos')!;
      expect(card.value).toBe('Tudo em dia');
      expect(card.tone).toBe('success');
      expect(card.note).toContain('Nenhum compromisso crítico');
      expect(card.note).not.toContain('cartões');
    });

    it('conta compromissos em atraso e dos próximos 7 dias', () => {
      const input = baseInput({
        compromissos: { emAtraso: 1, proximosSeteDias: 2, valorEmAberto: 450, dividaCartoes: 0, temCartoes: false }
      });
      const card = buildOverviewCards(input, 'Basic', 'month', fmt).find((c) => c.id === 'compromissos')!;
      expect(card.value).toBe('3 compromissos');
      expect(card.tone).toBe('danger');
      expect(card.note).toContain('1 em atraso');
      expect(card.note).toContain('2 nos próximos 7 dias');
    });

    it('só menciona fatura de cartões quando o usuário tem cartões com dívida', () => {
      const semCartao = buildOverviewCards(
        baseInput({ compromissos: { emAtraso: 0, proximosSeteDias: 0, valorEmAberto: 0, dividaCartoes: 300, temCartoes: false } }),
        'Basic',
        'month',
        fmt
      ).find((c) => c.id === 'compromissos')!;
      expect(semCartao.note).not.toContain('cartões');

      const comCartao = buildOverviewCards(
        baseInput({ compromissos: { emAtraso: 0, proximosSeteDias: 0, valorEmAberto: 0, dividaCartoes: 300, temCartoes: true } }),
        'Basic',
        'month',
        fmt
      ).find((c) => c.id === 'compromissos')!;
      expect(comCartao.note).toContain('Fatura em cartões');
    });
  });

  describe('buildOverviewCards — saúde financeira', () => {
    it('sem dados mostra estado inicial amigável', () => {
      const card = buildOverviewCards(baseInput(), 'Intermediate', 'month', fmt).find((c) => c.id === 'saude')!;
      expect(card.value).toBe('Sem dados');
      expect(card.tone).toBe('neutral');
      expect(card.note).toContain('Dados insuficientes');
    });

    it('mapeia status real da API para rótulo e tom', () => {
      const input = baseInput({ saude: { status: 'warning', resumo: 'Fluxo de caixa apertado neste mês.' } });
      const card = buildOverviewCards(input, 'Intermediate', 'month', fmt).find((c) => c.id === 'saude')!;
      expect(card.value).toBe('Atenção');
      expect(card.tone).toBe('warning');
      expect(card.note).toBe('Fluxo de caixa apertado neste mês.');
    });
  });

  describe('buildOverviewSummary', () => {
    it('Basic recebe mensagem neutra, sem análise', () => {
      const summary = buildOverviewSummary(baseInput({ saude: { status: 'ok', resumo: 'Análise da IA.' } }), 'Basic', 'month');
      expect(summary.analytical).toBeFalse();
      expect(summary.text).toBe('Seu resumo financeiro do período está pronto.');
    });

    it('Intermediate usa o resumo real da IA quando existe', () => {
      const summary = buildOverviewSummary(baseInput({ saude: { status: 'ok', resumo: 'Análise da IA.' } }), 'Intermediate', 'month');
      expect(summary.analytical).toBeTrue();
      expect(summary.text).toBe('Análise da IA.');
    });

    it('sem IA, deriva frases apenas de dados reais disponíveis', () => {
      const summary = buildOverviewSummary(
        baseInput({
          patrimonio: { liquido: 10000, ativos: 12000, passivos: 2000, investimentos: 5000, delta: 950 },
          despesas: { total: 1800, anterior: 2400 }
        }),
        'Advanced',
        'month'
      );
      expect(summary.analytical).toBeTrue();
      expect(summary.text).toContain('patrimônio cresceu');
      expect(summary.text).toContain('despesas caíram 25%');
    });

    it('sem dados analíticos, cai na mensagem neutra', () => {
      const summary = buildOverviewSummary(baseInput(), 'Intermediate', 'month');
      expect(summary.analytical).toBeFalse();
    });
  });
});
