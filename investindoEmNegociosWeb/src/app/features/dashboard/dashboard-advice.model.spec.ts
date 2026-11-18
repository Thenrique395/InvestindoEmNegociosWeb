import type { StoredExpense } from '../../core/data/api-data.service';
import { resolveLocalInsightPriority, resolveLocalInsightAction, resolveLocalInsightGoal, resolveLocalInsightDeadline } from './dashboard-advice.model';

const expense = (vencimento: string): StoredExpense => ({ id: vencimento, nome: '', categoria: '', valor: 100, vencimento });

describe('Orientações locais do dashboard', () => {
  it('prioriza projeção negativa e atraso sem cobertura como críticos', () => {
    expect(resolveLocalInsightPriority(0, 0, -1, 0, 0, 100, 100)).toBe('Crítico');
    expect(resolveLocalInsightPriority(1, 1000, 100, 0, 0, 0, 0)).toBe('Crítico');
  });
  it('distingue pendências a acompanhar de uma situação estável', () => {
    expect(resolveLocalInsightPriority(0, 0, 100, 10, 0, 100, 100)).toBe('Atenção');
    expect(resolveLocalInsightPriority(0, 0, 100, 0, 10, 100, 100)).toBe('Atenção');
    expect(resolveLocalInsightPriority(0, 0, 100, 0, 0, 100, 100)).toBe('Estável');
  });
  it('orienta pagar atrasos com mensagens diferentes conforme cobertura', () => {
    expect(resolveLocalInsightAction(1, 1000, 0, 0, 0, 0)).toContain('evitar agravamento do caixa');
    expect(resolveLocalInsightAction(1, 10, 1000, 0, 1000, 1000)).toContain('Você tem saldo para quitar');
  });
  it('prioriza déficit, depois recebimentos atrasados e depois manutenção', () => {
    expect(resolveLocalInsightAction(0, 0, -1, 1, 0, 0)).toContain('fechamento projetado está negativo');
    expect(resolveLocalInsightAction(0, 0, 100, 1, 100, 100)).toContain('Confirme as receitas em atraso');
    expect(resolveLocalInsightAction(0, 0, 100, 0, 100, 100)).toContain('Mantenha o ritmo');
  });
  it('meta de déficit usa o valor absoluto e precede atrasos e próximos vencimentos', () => {
    const result = resolveLocalInsightGoal(-250, 500, 1, 7);
    expect(result).toContain('recuperar');
    expect(result).toContain('250,00');
    expect(result).not.toContain('-250');
  });
  it('metas de atraso, reserva e manutenção seguem a prioridade existente', () => {
    expect(resolveLocalInsightGoal(100, 500, 1, 7)).toContain('zerar despesas atrasadas');
    expect(resolveLocalInsightGoal(100, 500, 0, 7)).toContain('próximos 7 dias');
    expect(resolveLocalInsightGoal(100, 0, 0, 7)).toContain('70/100');
  });
  it('prazo usa o primeiro vencimento futuro, ignorando datas inválidas e passadas', () => {
    const today = new Date(2026, 10, 15);
    const entries = Object.freeze([expense('20/11/2026'), expense('inválida'), expense('14/11/2026'), expense('16/11/2026')]);
    expect(resolveLocalInsightDeadline(today, entries)).toBe('Próximo vencimento em 1 dia(s) (16/11/2026).');
    expect(entries[0].vencimento).toBe('20/11/2026');
    expect(today.getDate()).toBe(15);
  });
  it('distingue vencimento de hoje de ausência de vencimentos futuros', () => {
    const today = new Date(2026, 10, 15);
    expect(resolveLocalInsightDeadline(today, [expense('15/11/2026')])).toBe('Próximo vencimento: hoje (15/11/2026).');
    expect(resolveLocalInsightDeadline(today, [expense('14/11/2026')])).toBe('Sem vencimentos em aberto no período.');
  });
});
