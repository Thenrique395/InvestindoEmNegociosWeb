import { collate, compareLocaleDate, monthKeyFromDate, monthLabelFromKey } from './transaction-helpers';

describe('transaction-helpers', () => {
  describe('monthKeyFromDate', () => {
    it('formata YYYY-MM com mês zero-padded', () => {
      expect(monthKeyFromDate(new Date(2026, 0, 15))).toBe('2026-01');
      expect(monthKeyFromDate(new Date(2026, 11, 1))).toBe('2026-12');
    });
  });

  describe('monthLabelFromKey', () => {
    it('inclui o ano no label (canônico)', () => {
      const label = monthLabelFromKey('2026-07');
      expect(label).toContain('2026');
      expect(label.toLowerCase()).toContain('jul');
    });

    it('retorna a própria chave quando inválida', () => {
      expect(monthLabelFromKey('sem-mes')).toBe('sem-mes');
      expect(monthLabelFromKey('2026-')).toBe('2026-');
    });
  });

  describe('compareLocaleDate', () => {
    it('ordena ascendente por data', () => {
      // "01/03" vs "05/03" ordenam igual em ambos os locales (day-first e month-first).
      expect(compareLocaleDate('01/03/2026', '05/03/2026')).toBeLessThan(0);
      expect(compareLocaleDate('05/03/2026', '01/03/2026')).toBeGreaterThan(0);
    });

    it('coloca entradas sem data válida por último (canônico)', () => {
      expect(compareLocaleDate('', '01/03/2026')).toBeGreaterThan(0);
      expect(compareLocaleDate('01/03/2026', '')).toBeLessThan(0);
      expect(compareLocaleDate('', '')).toBe(0);
      expect(compareLocaleDate(null, undefined)).toBe(0);
    });
  });

  describe('collate', () => {
    it('ignora caixa e acentos', () => {
      expect(collate('abc', 'ABC')).toBe(0);
      expect(collate('acao', 'ação')).toBe(0);
    });

    it('ordena alfabeticamente e trata nulos como vazio', () => {
      expect(collate('a', 'b')).toBeLessThan(0);
      expect(collate('b', 'a')).toBeGreaterThan(0);
      expect(collate(null, 'a')).toBeLessThan(0);
      expect(collate(null, null)).toBe(0);
    });
  });

  // Cenários ponta a ponta de ORDENAÇÃO de lista — travam o comportamento que as
  // telas de Receitas/Despesas obtêm ao usar estes helpers como comparadores.
  describe('ordenação de lista (cenário das telas)', () => {
    it('ordena por data ascendente e joga entradas sem data para o fim', () => {
      const entradas = ['05/03/2026', '', '01/03/2026', '03/03/2026', null];
      const ordenado = [...entradas].sort((a, b) => compareLocaleDate(a, b));
      expect(ordenado).toEqual(['01/03/2026', '03/03/2026', '05/03/2026', '', null]);
    });

    it('ordena texto ignorando caixa/acentos (estável para equivalentes)', () => {
      const nomes = ['Água', 'agua', 'Banco', 'aluguel'];
      const ordenado = [...nomes].sort((a, b) => collate(a, b));
      // "agua"/"Água" equivalentes (mantêm ordem relativa), depois "aluguel", depois "Banco".
      expect(ordenado).toEqual(['Água', 'agua', 'aluguel', 'Banco']);
    });
  });
});
