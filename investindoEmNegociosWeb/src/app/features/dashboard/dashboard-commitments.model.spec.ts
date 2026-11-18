import type { StoredExpense, StoredIncome } from '../../core/data/api-data.service';
import { buildDashboardCommitments } from './dashboard-commitments.model';

const expense = (vencimento: string, valor: number, status: StoredExpense['status'] = 'OPEN'): StoredExpense => ({ id: vencimento, nome: 'Conta', categoria: '', valor, vencimento, status });
const income = (recebimento: string, valor: number, status: StoredIncome['status'] = 'OPEN'): StoredIncome => ({ id: recebimento, fonte: 'Entrada', recebimento, valor, status });

describe('Compromissos e atrasos do dashboard', () => {
  const reference = new Date(2026, 10, 15, 18, 30);
  it('separa atrasados de hoje e inclui o sétimo dia, excluindo o oitavo', () => {
    const result = buildDashboardCommitments([
      expense('10/11/2026', 100), expense('14/11/2026', 50), expense('15/11/2026', 20),
      expense('22/11/2026', 30, 'ANTICIPATED'), expense('23/11/2026', 999),
      expense('10/11/2026', 999, 'PAID'), expense('10/11/2026', 999, 'CANCELED'), expense('inválida', 999)
    ], [], reference);
    expect(result.summary).toEqual({ emAtraso: 2, proximosSeteDias: 2, valorEmAberto: 200 });
    expect(result.details.despesasEmAtraso).toEqual({ quantidade: 2, valor: 150, diasDoMaisAntigo: 5 });
    expect(result.details.despesasProximas).toEqual({ quantidade: 2, valor: 50 });
    expect(reference.getHours()).toBe(18);
  });
  it('considera somente entradas pendentes anteriores a hoje como atrasadas', () => {
    const result = buildDashboardCommitments([], [
      income('14/11/2026', 200), income('01/11/2026', 50, 'ANTICIPATED'),
      income('15/11/2026', 999), income('14/11/2026', 999, 'PAID'),
      income('14/11/2026', 999, 'CANCELED'), income('inválida', 999)
    ], reference);
    expect(result.details.receitasAtrasadas).toEqual({ quantidade: 2, valor: 250 });
  });
  it('conta atrasos de meses anteriores e atravessa a virada do ano', () => {
    const result = buildDashboardCommitments([expense('30/11/2026', 10), expense('01/01/2027', 20)], [], new Date(2026, 11, 28));
    expect(result.summary).toEqual({ emAtraso: 1, proximosSeteDias: 1, valorEmAberto: 30 });
    expect(result.details.despesasEmAtraso.diasDoMaisAntigo).toBe(28);
  });
  it('não inventa vencimentos ou dados de fechamento de cartão', () => {
    const result = buildDashboardCommitments([], [], reference);
    expect(result.summary).toEqual({ emAtraso: 0, proximosSeteDias: 0, valorEmAberto: 0 });
    expect(result.details.despesasEmAtraso.diasDoMaisAntigo).toBeNull();
    expect(result.details.faturasFechando).toEqual({ quantidade: 0, valor: 0 });
  });
});
