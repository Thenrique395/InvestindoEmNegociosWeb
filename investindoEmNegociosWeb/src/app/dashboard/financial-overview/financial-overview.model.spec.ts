import {
  buildOverviewCards,
  buildOverviewEyebrow,
  buildOverviewGreeting,
  buildOverviewHealth,
  buildOverviewSummary,
  FinancialOverviewInput,
  planoComercialLabel
} from './financial-overview.model';

const fmt = (value: number) => `R$ ${value.toFixed(2)}`;

function baseInput(overrides: Partial<FinancialOverviewInput> = {}): FinancialOverviewInput {
  return {
    periodoContexto: {
      nome: 'mês',
      nomeComArtigo: 'no mês',
      detalheReceitas: 'A receber no mês',
      detalheDespesas: 'A pagar no mês',
      detalheProjetado: 'Projetado no mês'
    },
    saldoPeriodo: 500,
    saldoDisponivel: 1200,
    saldoEmContas: 2000,
    pendencias: 800,
    saldoProjetado: 1500,
    receitas: { total: 3000, pendentes: 200, anterior: null },
    despesas: { total: 1800, pagas: 700, emAberto: 1100, anterior: null },
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
      expect(planoComercialLabel('Intermediate')).toBe('Controle');
      expect(planoComercialLabel('Advanced')).toBe('Patrimônio');
      expect(planoComercialLabel('Admin')).toBe('Patrimônio');
      expect(planoComercialLabel(null)).toBe('Essencial');
    });
  });

  describe('buildOverviewCards — regras por plano', () => {
    it('Basic fecha a faixa com "Dá para gastar", não com "Comprometido"', () => {
      const ids = buildOverviewCards(baseInput(), 'Basic', 'month', fmt).map((c) => c.id);
      expect(ids).toEqual(['saldo', 'receitas', 'despesas', 'sobra']);
    });

    it('"Dá para gastar" usa o saldo projetado, com lavagem verde', () => {
      const card = buildOverviewCards(baseInput(), 'Basic', 'month', fmt).find((c) => c.id === 'sobra')!;
      expect(card.value).toBe(fmt(1500));
      expect(card.wash).toBe('income');
    });

    it('Intermediate ganha patrimônio e comprometido', () => {
      const ids = buildOverviewCards(baseInput(), 'Intermediate', 'month', fmt).map((c) => c.id);
      expect(ids).toEqual(['saldo', 'patrimonio', 'receitas', 'despesas', 'comprometido']);
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
      const input = baseInput({ despesas: { total: 1800, pagas: 700, emAberto: 1100, anterior: 2000 } });
      const card = buildOverviewCards(input, 'Basic', 'quarter', fmt).find((c) => c.id === 'despesas')!;
      expect(card.delta).not.toBeNull();
      expect(card.delta!.direction).toBe('down');
      expect(card.delta!.favorable).toBeTrue();
      expect(card.delta!.text).toBe('10%');
      // O recorte fica fora da pílula, num campo próprio.
      expect(card.delta!.context).toBe('vs. trimestre anterior');
    });

    it('queda de receitas é desfavorável; alta é favorável', () => {
      const down = buildOverviewCards(baseInput({ receitas: { total: 900, pendentes: 0, anterior: 1000 } }), 'Basic', 'month', fmt);
      expect(down.find((c) => c.id === 'receitas')!.delta!.favorable).toBeFalse();

      const up = buildOverviewCards(baseInput({ receitas: { total: 1100, pendentes: 0, anterior: 1000 } }), 'Basic', 'month', fmt);
      expect(up.find((c) => c.id === 'receitas')!.delta!.favorable).toBeTrue();
    });

    it('separa valores realizados e previstos no período selecionado', () => {
      const cards = buildOverviewCards(baseInput(), 'Intermediate', 'month', fmt);
      const saldo = cards.find((c) => c.id === 'saldo')!;
      const receitas = cards.find((c) => c.id === 'receitas')!;
      const despesas = cards.find((c) => c.id === 'despesas')!;

      expect(saldo.note).toContain('Em contas');
      expect(saldo.note).toContain('Em aberto');
      // A projeção sai da célula em destaque: três informações a apertam.
      expect(saldo.note).not.toContain('Projetado no mês');
      expect(receitas.value).toBe(fmt(3200));
      expect(receitas.note).toContain('Recebidas no mês');
      expect(receitas.note).toContain('A receber no mês');
      expect(despesas.note).toContain('Pagas no mês');
      expect(despesas.note).toContain('A pagar no mês');
    });
  });

  describe('buildOverviewCards — barras: regra única parte ÷ (parte + resto)', () => {
    const barra = (id: string, role: 'Basic' | 'Intermediate' = 'Basic') =>
      buildOverviewCards(baseInput(), role, 'month', fmt).find((c) => c.id === id)!.progress;

    it('receitas: recebidas ÷ (recebidas + a receber)', () => {
      // 3000 recebidas, 200 a receber
      expect(barra('receitas')!.percent).toBeCloseTo(93.75, 2);
    });

    it('despesas: pagas ÷ (pagas + em aberto), e não sobre o total do card', () => {
      // 700 pagas, 1100 em aberto — o `total` de 1800 coincide aqui, mas o
      // denominador tem que ser a soma das duas partes.
      expect(barra('despesas')!.percent).toBeCloseTo(38.89, 2);
    });

    it('despesas: total com cancelado não impede a barra de fechar em 100%', () => {
      const input = baseInput({ despesas: { total: 5000, pagas: 900, emAberto: 0, anterior: null } });
      const card = buildOverviewCards(input, 'Basic', 'month', fmt).find((c) => c.id === 'despesas')!;
      expect(card.progress!.percent).toBe(100);
    });

    it('dá para gastar: sobra ÷ (sobra + comprometido)', () => {
      // saldoProjetado 1500, despesas em aberto 1100
      expect(barra('sobra')!.percent).toBeCloseTo(57.69, 2);
    });

    it('dá para gastar: margem negativa zera a barra em vez de escondê-la', () => {
      const input = baseInput({ saldoProjetado: -400 });
      const card = buildOverviewCards(input, 'Basic', 'month', fmt).find((c) => c.id === 'sobra')!;
      expect(card.progress!.percent).toBe(0);
    });

    it('só essas três têm barra — as outras medem outra pergunta', () => {
      const cards = buildOverviewCards(baseInput(), 'Intermediate', 'month', fmt);
      const comBarra = cards.filter((c) => c.progress !== null).map((c) => c.id);
      expect(comBarra).toEqual(['receitas', 'despesas']);
      expect(cards.find((c) => c.id === 'saldo')!.progress).toBeNull();
      expect(cards.find((c) => c.id === 'patrimonio')!.progress).toBeNull();
      expect(cards.find((c) => c.id === 'comprometido')!.progress).toBeNull();
    });

    it('sem denominador não há barra — nada de proporção sobre zero', () => {
      const input = baseInput({ despesas: { total: 0, pagas: 0, emAberto: 0, anterior: null } });
      const card = buildOverviewCards(input, 'Basic', 'month', fmt).find((c) => c.id === 'despesas')!;
      expect(card.progress).toBeNull();
    });
  });

  describe('buildOverviewCards — comprometido', () => {
    it('usa as despesas em aberto, sem somar a dívida de cartão por cima', () => {
      const input = baseInput({
        compromissos: { emAtraso: 0, proximosSeteDias: 0, valorEmAberto: 0, dividaCartoes: 900, temCartoes: true }
      });
      const card = buildOverviewCards(input, 'Intermediate', 'month', fmt).find((c) => c.id === 'comprometido')!;
      expect(card.value).toBe(fmt(1100));
    });

    it('não leva barra: peso na renda é outra pergunta que não a de conclusão', () => {
      const card = buildOverviewCards(baseInput(), 'Intermediate', 'month', fmt).find((c) => c.id === 'comprometido')!;
      expect(card.progress).toBeNull();
    });
  });

  describe('buildOverviewCards — variação do patrimônio', () => {
    it('mostra porcentagem, não reais: sobre seis dígitos, o absoluto não diz nada', () => {
      const input = baseInput({
        patrimonio: { liquido: 10250, ativos: 12000, passivos: 2000, investimentos: 5000, delta: 250 }
      });
      const card = buildOverviewCards(input, 'Intermediate', 'month', fmt).find((c) => c.id === 'patrimonio')!;
      // 250 sobre os 10000 anteriores
      expect(card.delta!.text).toBe('2,5%');
      expect(card.delta!.context).toBe('no mês');
    });

    it('sem posição anterior positiva, cai no valor absoluto', () => {
      const input = baseInput({
        patrimonio: { liquido: 300, ativos: 300, passivos: 0, investimentos: 0, delta: 500 }
      });
      const card = buildOverviewCards(input, 'Intermediate', 'month', fmt).find((c) => c.id === 'patrimonio')!;
      expect(card.delta!.text).toBe(fmt(500));
    });
  });

  describe('buildOverviewGreeting', () => {
    it('varia com a hora e usa só o primeiro nome', () => {
      const nome = 'Henrique Santos Silva';
      expect(buildOverviewGreeting(nome, new Date(2026, 7, 21, 9))).toBe('Bom dia, Henrique');
      expect(buildOverviewGreeting(nome, new Date(2026, 7, 21, 14))).toBe('Boa tarde, Henrique');
      expect(buildOverviewGreeting(nome, new Date(2026, 7, 21, 21))).toBe('Boa noite, Henrique');
    });

    it('sem nome salvo, cumprimenta sem inventar tratamento', () => {
      expect(buildOverviewGreeting('   ', new Date(2026, 7, 21, 9))).toBe('Bom dia');
    });
  });

  describe('buildOverviewEyebrow', () => {
    it('compõe visão geral com o rótulo do período', () => {
      expect(buildOverviewEyebrow('agosto de 2026')).toBe('Visão geral · agosto de 2026');
    });
  });

  describe('buildOverviewHealth', () => {
    const comSaude = () =>
      baseInput({
        saude: {
          status: 'ok',
          resumo: 'Reserva cobre 4,2 meses.',
          score: 78,
          fatores: [{ rotulo: 'Caixa', status: 'ok', explicacao: 'Fluxo equilibrado.' }]
        }
      });

    it('só o perfil Patrimônio vê o painel', () => {
      expect(buildOverviewHealth(comSaude(), 'Intermediate')).toBeNull();
      expect(buildOverviewHealth(comSaude(), 'Advanced')).not.toBeNull();
    });

    it('sem análise da IA não há painel — nada de índice inventado', () => {
      expect(buildOverviewHealth(baseInput(), 'Advanced')).toBeNull();
    });

    it('traduz a nota em faixa e tom', () => {
      const faixa = (score: number) => buildOverviewHealth(
        baseInput({ saude: { status: 'ok', resumo: '', score, fatores: [] } }), 'Advanced'
      )!;
      expect(faixa(85).faixa).toBe('sólida');
      expect(faixa(70).faixa).toBe('boa');
      expect(faixa(50).tone).toBe('warning');
      expect(faixa(20).tone).toBe('danger');
    });

    it('limita a nota à faixa de 0 a 100', () => {
      const acima = buildOverviewHealth(baseInput({ saude: { status: 'ok', resumo: '', score: 140, fatores: [] } }), 'Advanced')!;
      expect(acima.score).toBe(100);
    });
  });

  describe('buildOverviewSummary', () => {
    it('Basic recebe mensagem neutra, sem análise', () => {
      const summary = buildOverviewSummary(baseInput({ saude: { status: 'ok', resumo: 'Análise da IA.', score: 78, fatores: [] } }), 'Basic', 'month');
      expect(summary.analytical).toBeFalse();
      expect(summary.text).toBe('Seu resumo financeiro do período está pronto.');
    });

    it('Patrimônio não repete o resumo da IA: o painel de saúde já o mostra', () => {
      const summary = buildOverviewSummary(
        baseInput({ saude: { status: 'ok', resumo: 'Análise da IA.', score: 78, fatores: [] } }),
        'Advanced',
        'month'
      );
      expect(summary.text).not.toBe('Análise da IA.');
    });

    it('Intermediate usa o resumo real da IA quando existe', () => {
      const summary = buildOverviewSummary(baseInput({ saude: { status: 'ok', resumo: 'Análise da IA.', score: 78, fatores: [] } }), 'Intermediate', 'month');
      expect(summary.analytical).toBeTrue();
      expect(summary.text).toBe('Análise da IA.');
    });

    it('sem IA, deriva frases apenas de dados reais disponíveis', () => {
      const summary = buildOverviewSummary(
        baseInput({
          patrimonio: { liquido: 10000, ativos: 12000, passivos: 2000, investimentos: 5000, delta: 950 },
          despesas: { total: 1800, pagas: 700, emAberto: 1100, anterior: 2400 }
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
