import { assistantRiskTone } from './assistant-context.model';

describe('assistant-context.model', () => {
  it('mapeia o score de risco para o tom do card', () => {
    expect(assistantRiskTone(80)).toBe('danger');
    expect(assistantRiskTone(50)).toBe('warning');
    expect(assistantRiskTone(10)).toBe('success');
  });

  it('trata limites e valores ausentes', () => {
    expect(assistantRiskTone(66)).toBe('warning');
    expect(assistantRiskTone(33)).toBe('success');
    expect(assistantRiskTone(0)).toBe('success');
    expect(assistantRiskTone(undefined as unknown as number)).toBe('success');
  });
});
