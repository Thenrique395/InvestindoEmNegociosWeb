import { riskBadgeTone, riskLevel, riskUsageTone } from './snapshots-overview.model';

describe('snapshots-overview.model', () => {
  it('classifica risco pela classificação textual', () => {
    expect(riskLevel('Alto', 0)).toBe('high');
    expect(riskLevel('Crítico', 0)).toBe('high');
    expect(riskLevel('Moderado', 0)).toBe('moderate');
    expect(riskLevel('Baixo', 90)).toBe('low'); // texto tem prioridade sobre score
  });

  it('usa o score quando não há classificação reconhecível', () => {
    expect(riskLevel('', 80)).toBe('high');
    expect(riskLevel(null, 50)).toBe('moderate');
    expect(riskLevel(undefined, 10)).toBe('low');
  });

  it('mapeia nível para tom de badge', () => {
    expect(riskBadgeTone('high')).toBe('danger');
    expect(riskBadgeTone('moderate')).toBe('warning');
    expect(riskBadgeTone('low')).toBe('success');
  });

  it('mapeia nível para tom de UsageBar', () => {
    expect(riskUsageTone('high')).toBe('critical');
    expect(riskUsageTone('moderate')).toBe('warning');
    expect(riskUsageTone('low')).toBe('ok');
  });
});
