import { affectedCount, shouldAskScope, type InstallmentContext } from './installment-scope';

const ctx = (current: number, total: number): InstallmentContext => ({
  current,
  total,
  description: 'Notebook Dell',
});

describe('alcance de parcelado', () => {
  describe('shouldAskScope', () => {
    it('não pergunta em lançamento à vista', () => {
      expect(shouldAskScope(ctx(1, 1))).toBeFalse();
    });

    it('não pergunta na última parcela — não há seguinte', () => {
      expect(shouldAskScope(ctx(12, 12))).toBeFalse();
    });

    it('pergunta no meio do parcelamento', () => {
      expect(shouldAskScope(ctx(3, 12))).toBeTrue();
    });

    it('não pergunta sem contexto', () => {
      expect(shouldAskScope(null)).toBeFalse();
    });
  });

  describe('affectedCount', () => {
    it('uma parcela quando o alcance é único', () => {
      expect(affectedCount(ctx(3, 12), 'single')).toBe(1);
    });

    it('conta esta e as seguintes', () => {
      expect(affectedCount(ctx(3, 12), 'forward')).toBe(10);
    });

    it('na última parcela, adiante atinge só ela', () => {
      expect(affectedCount(ctx(12, 12), 'forward')).toBe(1);
    });

    it('nunca retorna menos de uma', () => {
      expect(affectedCount(ctx(15, 12), 'forward')).toBe(1);
    });
  });
});
