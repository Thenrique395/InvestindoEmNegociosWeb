import { runStatusLabel, runStatusTone, successRateTone } from './robots-monitor.model';

describe('robots-monitor.model', () => {
  it('rotula o status da execução', () => {
    expect(runStatusLabel(true, false)).toBe('Sucesso');
    expect(runStatusLabel(false, false)).toBe('Falha');
    expect(runStatusLabel(false, true)).toBe('Pulado');
    expect(runStatusLabel(true, true)).toBe('Pulado');
  });

  it('mapeia o tom do status', () => {
    expect(runStatusTone(true, false)).toBe('success');
    expect(runStatusTone(false, false)).toBe('danger');
    expect(runStatusTone(false, true)).toBe('warning');
  });

  it('mapeia o tom da taxa de sucesso por faixa', () => {
    expect(successRateTone(95)).toBe('success');
    expect(successRateTone(90)).toBe('success');
    expect(successRateTone(75)).toBe('warning');
    expect(successRateTone(50)).toBe('danger');
    expect(successRateTone(0)).toBe('danger');
  });
});
