import {
  cardRemovalBlockMessage,
  expenseMonthKeys,
  statementNoticeMessage,
  statementNoticeMonth
} from './card-expense-notice';

describe('avisos de despesa de cartão', () => {
  describe('expenseMonthKeys', () => {
    it('agrupa por mês, sem repetir e em ordem', () => {
      expect(
        expenseMonthKeys([
          { vencimento: '10/09/2026' },
          { vencimento: '02/08/2026' },
          { vencimento: '28/09/2026' }
        ])
      ).toEqual(['2026-08', '2026-09']);
    });

    it('ignora datas ilegíveis', () => {
      expect(expenseMonthKeys([{ vencimento: '' }, { vencimento: 'sem data' }])).toEqual([]);
    });
  });

  describe('statementNoticeMonth', () => {
    it('não avisa quando o lançamento caiu no mês aberto', () => {
      expect(statementNoticeMonth('2026-08', ['2026-08'])).toBeNull();
    });

    it('aponta o primeiro mês fora do aberto', () => {
      expect(statementNoticeMonth('2026-08', ['2026-10', '2026-09'])).toBe('2026-09');
    });

    it('sem data legível, não manda procurar em lugar nenhum', () => {
      expect(statementNoticeMonth('2026-08', [])).toBeNull();
    });

    it('monta a frase com o mês por extenso', () => {
      expect(statementNoticeMessage('2026-09')).toContain('setembro de 2026');
    });
  });

  describe('cardRemovalBlockMessage', () => {
    it('diz quantas são e em que mês estão', () => {
      const msg = cardRemovalBlockMessage([{ vencimento: '10/09/2026' }]);
      expect(msg).toContain('1 despesa vinculada');
      expect(msg).toContain('setembro de 2026');
    });

    it('lista os meses quando há mais de um', () => {
      const msg = cardRemovalBlockMessage([
        { vencimento: '10/09/2026' },
        { vencimento: '10/10/2026' },
        { vencimento: '11/11/2026' }
      ]);
      expect(msg).toContain('3 despesas vinculadas');
      expect(msg).toContain('setembro de 2026, outubro de 2026 e novembro de 2026');
    });

    it('sem data legível, mantém a contagem e omite o "onde"', () => {
      const msg = cardRemovalBlockMessage([{ vencimento: '' }]);
      expect(msg).toContain('1 despesa vinculada');
      expect(msg).not.toContain(' em ');
    });
  });
});
