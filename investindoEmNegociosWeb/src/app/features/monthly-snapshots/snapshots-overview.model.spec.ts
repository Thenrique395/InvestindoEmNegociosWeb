import { riskBadgeTone, riskLevel, riskPercent, riskProgressTone } from './snapshots-overview.model';

describe('snapshots-overview.model', () => {
  describe('riskLevel', () => {
    it('mapeia as classificações que a API emite', () => {
      // RiskBotService.DetermineClassification: critical | warning | healthy
      expect(riskLevel('critical', 20)).toBe('high');
      expect(riskLevel('warning', 55)).toBe('moderate');
      expect(riskLevel('healthy', 84)).toBe('low');
    });

    it("não lê 'healthy' como risco alto", () => {
      // Regressão: 'healthy'.includes('alt') é true ("he-alt-hy"), e o teste de risco
      // alto casava com o estado mais saudável — a barra saía vermelha e cheia.
      expect(riskLevel('healthy', 84)).not.toBe('high');
      expect(riskBadgeTone(riskLevel('healthy', 84))).toBe('success');
    });

    it('aceita classificação traduzida', () => {
      expect(riskLevel('Alto', 0)).toBe('high');
      expect(riskLevel('Crítico', 0)).toBe('high');
      expect(riskLevel('Moderado', 0)).toBe('moderate');
      expect(riskLevel('Baixo', 90)).toBe('low');
      expect(riskLevel('Controlado', 90)).toBe('low');
    });

    it('trata o score como saúde quando não há classificação', () => {
      // Score alto = saudável. O oposto disto era o segundo bug.
      expect(riskLevel('', 90)).toBe('low');
      expect(riskLevel(null, 55)).toBe('moderate');
      expect(riskLevel(undefined, 10)).toBe('high');
    });

    it('usa os mesmos limiares do backend', () => {
      expect(riskLevel('', 44)).toBe('high');
      expect(riskLevel('', 45)).toBe('moderate');
      expect(riskLevel('', 69)).toBe('moderate');
      expect(riskLevel('', 70)).toBe('low');
    });
  });

  describe('riskPercent', () => {
    it('preenche o complemento da saúde', () => {
      expect(riskPercent(84)).toBe(16);
      expect(riskPercent(100)).toBe(0);
      expect(riskPercent(0)).toBe(100);
    });

    it('protege contra valor fora da faixa', () => {
      expect(riskPercent(120)).toBe(0);
      expect(riskPercent(-10)).toBe(100);
      expect(riskPercent(Number.NaN)).toBe(100);
    });
  });

  it('mapeia nível para tom de badge', () => {
    expect(riskBadgeTone('high')).toBe('danger');
    expect(riskBadgeTone('moderate')).toBe('warning');
    expect(riskBadgeTone('low')).toBe('success');
  });

  it('mapeia nível para tom da barra de progresso', () => {
    expect(riskProgressTone('high')).toBe('expense');
    expect(riskProgressTone('moderate')).toBe('warning');
    expect(riskProgressTone('low')).toBe('income');
  });
});
