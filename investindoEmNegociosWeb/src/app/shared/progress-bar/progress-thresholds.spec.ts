import { toneFor, toneForConquista, toneForConsumo } from './progress-thresholds';

describe('limiares de progresso', () => {
  describe('consumo — passar é ruim', () => {
    it('verde até 80%', () => {
      expect(toneForConsumo(0)).toBe('income');
      expect(toneForConsumo(79.9)).toBe('income');
    });

    it('atenção a partir de 80% e até 100%', () => {
      expect(toneForConsumo(80)).toBe('warning');
      expect(toneForConsumo(100)).toBe('warning');
    });

    it('vermelho acima de 100%', () => {
      expect(toneForConsumo(100.1)).toBe('expense');
      expect(toneForConsumo(118)).toBe('expense');
    });
  });

  describe('conquista — chegar é bom', () => {
    it('verde ao atingir a meta', () => {
      expect(toneForConquista(100)).toBe('income');
      expect(toneForConquista(140)).toBe('income');
    });

    it('azul enquanto está em ritmo', () => {
      expect(toneForConquista(10, true)).toBe('primary');
      expect(toneForConquista(99, true)).toBe('primary');
    });

    it('atenção quando está fora de ritmo', () => {
      expect(toneForConquista(32, false)).toBe('warning');
    });

    it('sem informação de ritmo, assume em ritmo — não acusa atraso inexistente', () => {
      expect(toneForConquista(32)).toBe('primary');
    });
  });

  describe('as duas semânticas não se confundem', () => {
    it('90% é atenção em consumo, mas está em ritmo em conquista', () => {
      expect(toneFor('consumo', 90)).toBe('warning');
      expect(toneFor('conquista', 90)).toBe('primary');
    });

    it('120% é estouro em consumo, mas conquista em meta', () => {
      expect(toneFor('consumo', 120)).toBe('expense');
      expect(toneFor('conquista', 120)).toBe('income');
    });
  });
});
