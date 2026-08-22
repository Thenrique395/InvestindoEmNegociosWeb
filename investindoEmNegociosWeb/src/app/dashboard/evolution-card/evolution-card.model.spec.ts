import { buildEvolutionAxisNote, buildEvolutionView, EvolutionInput } from './evolution-card.model';

const fmt = (v: number) => `R$ ${v}`;

function base(overrides: Partial<EvolutionInput> = {}): EvolutionInput {
  return {
    months: [
      { label: 'jun', income: 1000, expense: 600, netWorth: 10000 },
      { label: 'jul', income: 1200, expense: 700, netWorth: 10500 },
      { label: 'ago', income: 1100, expense: 800, netWorth: 11000 }
    ],
    sobra: 300,
    patrimonioDeltaPct: 2.6,
    ...overrides
  };
}

describe('evolution-card.model', () => {
  describe('buildEvolutionView — o card muda com a pergunta do perfil', () => {
    it('Essencial e Controle veem receitas × despesas, com a sobra em destaque', () => {
      const view = buildEvolutionView(base(), 'Intermediate');
      expect(view.title).toBe('Receitas e despesas');
      expect(view.series.map((s) => s.label)).toEqual(['Receitas', 'Despesas']);
      expect(view.value).toBe(300);
      expect(view.tag.text).toBe('sobra do mês');
    });

    it('Patrimônio ganha a linha de patrimônio e passa a mostrar a variação', () => {
      const view = buildEvolutionView(base(), 'Advanced');
      expect(view.title).toBe('Patrimônio');
      expect(view.series.map((s) => s.label)).toEqual(['Patrimônio', 'Receitas', 'Despesas']);
      expect(view.value).toBe(11000);
      expect(view.tag.text).toBe('↑ 2,6%');
      expect(view.tag.tone).toBe('success');
    });

    it('a linha de patrimônio usa escala própria: não pode achatar o fluxo', () => {
      const view = buildEvolutionView(base(), 'Advanced');
      expect(view.series.find((s) => s.label === 'Patrimônio')!.axis).toBe('secondary');
      expect(view.series.find((s) => s.label === 'Receitas')!.axis).toBeUndefined();
    });

    it('sem histórico de patrimônio, o Advanced cai no gráfico de fluxo', () => {
      const semPatrimonio = base({
        months: base().months.map((m) => ({ ...m, netWorth: null })),
        patrimonioDeltaPct: null
      });
      const view = buildEvolutionView(semPatrimonio, 'Advanced');
      expect(view.series.map((s) => s.label)).toEqual(['Receitas', 'Despesas']);
    });

    it('sobra negativa marca a pílula como despesa, não como neutra', () => {
      const view = buildEvolutionView(base({ sobra: -120, patrimonioDeltaPct: null }), 'Basic');
      expect(view.tag.tone).toBe('danger');
    });

    it('a janela vem do tamanho da série que o container montou', () => {
      expect(buildEvolutionView(base(), 'Basic').subtitle).toBe('Últimos 3 meses');
    });
  });

  describe('buildEvolutionAxisNote', () => {
    it('descreve apenas o fluxo — o patrimônio é descrito pelos ticks da faixa de cima', () => {
      const nota = buildEvolutionAxisNote(base(), 'Advanced', fmt);
      expect(nota).toBe('Fluxo mensal · R$ 0 a R$ 1200');
    });

    it('sem meses, não inventa faixa', () => {
      expect(buildEvolutionAxisNote(base({ months: [] }), 'Basic', fmt)).toBe('');
    });
  });
});
