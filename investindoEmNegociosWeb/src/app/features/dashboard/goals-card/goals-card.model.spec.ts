import { buildGoalRows, GoalEntry } from './goals-card.model';

const HOJE = new Date(2026, 7, 21);

function g(over: Partial<GoalEntry> = {}): GoalEntry {
  return {
    id: 'g',
    title: 'Meta',
    target: 1000,
    current: 500,
    startDate: null,
    targetDate: '2027-12-31',
    canceled: false,
    ...over
  };
}

describe('goals-card.model', () => {
  it('ignora meta cancelada e meta sem alvo', () => {
    const rows = buildGoalRows([g({ id: 'c', canceled: true }), g({ id: 'z', target: 0 }), g({ id: 'ok' })], HOJE);
    expect(rows.map((r) => r.id)).toEqual(['ok']);
  });

  it('usa escala de conquista: 100% é verde, não vermelho', () => {
    expect(buildGoalRows([g({ current: 1000 })], HOJE)[0].pace).toBe('done');
  });

  it('prazo vencido sem fechar é o caso vermelho', () => {
    expect(buildGoalRows([g({ targetDate: '2026-01-01' })], HOJE)[0].pace).toBe('late');
  });

  it('progresso baixo com prazo longe não é atraso — o ritmo é contra o tempo decorrido', () => {
    // 10% guardado, mas só ~9% do prazo decorrido (ago/2026 de jul/2026 a 2029).
    const row = buildGoalRows([g({ current: 100, startDate: '2026-07-01', targetDate: '2029-07-01' })], HOJE)[0];
    expect(row.pace).toBe('onTrack');
  });

  it('atrás do ritmo é guardar menos do que o tempo já consumido', () => {
    // 10% guardado com ~92% do prazo decorrido.
    const row = buildGoalRows([g({ current: 100, startDate: '2025-01-01', targetDate: '2026-09-01' })], HOJE)[0];
    expect(row.pace).toBe('behind');
  });

  it('sem data de início não há decorrido a medir, e a meta não é acusada', () => {
    expect(buildGoalRows([g({ current: 10, startDate: null })], HOJE)[0].pace).toBe('onTrack');
  });

  it('meta sem prazo não é acusada de atraso', () => {
    expect(buildGoalRows([g({ current: 10, targetDate: null })], HOJE)[0].pace).toBe('onTrack');
  });

  it('limita a barra a 100 mesmo com aporte acima do alvo', () => {
    expect(buildGoalRows([g({ current: 3000 })], HOJE)[0].percent).toBe(100);
  });

  it('mostra as mais adiantadas primeiro, no limite do card', () => {
    const rows = buildGoalRows(
      [g({ id: 'a', current: 100 }), g({ id: 'b', current: 900 }), g({ id: 'c', current: 500 }), g({ id: 'd', current: 700 })],
      HOJE
    );
    expect(rows.map((r) => r.id)).toEqual(['b', 'd', 'c']);
  });
});
