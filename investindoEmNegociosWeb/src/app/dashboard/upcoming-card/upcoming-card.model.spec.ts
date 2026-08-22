import { buildUpcomingView, UpcomingEntry } from './upcoming-card.model';

const HOJE = new Date(2026, 7, 21);

function entry(dias: number, over: Partial<UpcomingEntry> = {}): UpcomingEntry {
  const date = new Date(HOJE);
  date.setDate(date.getDate() + dias);
  return { id: `e${dias}`, name: 'Conta', date, amount: 100, kind: 'expense', context: 'Moradia', ...over };
}

describe('upcoming-card.model', () => {
  it('mostra só a janela de 7 dias, em ordem de data', () => {
    const view = buildUpcomingView([entry(5), entry(1), entry(9), entry(3)], HOJE);
    expect(view.rows.map((r) => r.day)).toEqual(['22', '24', '26']);
  });

  it('inclui hoje e o sétimo dia; exclui o oitavo', () => {
    const view = buildUpcomingView([entry(0), entry(7), entry(8)], HOJE);
    expect(view.rows.length).toBe(2);
  });

  it('não repete o que já está em "Precisa da sua atenção": vencido fica de fora', () => {
    const view = buildUpcomingView([entry(-2), entry(2)], HOJE);
    expect(view.rows.length).toBe(1);
    expect(view.rows[0].day).toBe('23');
  });

  it('separa o que entra do que sai no detalhe da linha', () => {
    const view = buildUpcomingView(
      [entry(1, { kind: 'income', context: 'Serviços', name: 'Consultoria' })],
      HOJE
    );
    expect(view.rows[0].detail).toBe('Serviços · a receber');
    expect(view.rows[0].kind).toBe('income');
  });

  it('resume a janela contando entradas e saídas', () => {
    const view = buildUpcomingView([entry(1), entry(2), entry(3, { kind: 'income' })], HOJE);
    expect(view.summary).toBe('2 saídas e 1 entrada até 28/08.');
  });

  it('janela vazia diz até quando olhou', () => {
    expect(buildUpcomingView([], HOJE).summary).toBe('Nada previsto até 28/08.');
  });

  it('limita a lista para o card não virar uma segunda tela de lançamentos', () => {
    const muitos = Array.from({ length: 10 }, (_, i) => entry(1, { id: `x${i}` }));
    expect(buildUpcomingView(muitos, HOJE).rows.length).toBe(6);
  });
});
