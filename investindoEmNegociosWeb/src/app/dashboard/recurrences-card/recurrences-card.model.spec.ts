import { buildRecurrencesView, RecurrenceEntry } from './recurrences-card.model';

function e(over: Partial<RecurrenceEntry> = {}): RecurrenceEntry {
  return { id: 'x', title: 'Item', amount: 100, direction: 'expense', day: 5, category: 'Moradia', settled: false, ...over };
}

describe('recurrences-card.model', () => {
  it('põe saídas antes de entradas e ordena por valor', () => {
    const view = buildRecurrencesView([
      e({ id: 'a', amount: 300 }),
      e({ id: 'b', amount: 900, direction: 'income' }),
      e({ id: 'c', amount: 800 })
    ]);
    expect(view.rows.map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('monta o detalhe com dia e categoria, com dia sempre em dois dígitos', () => {
    const view = buildRecurrencesView([e({ day: 5, category: 'Moradia' })]);
    expect(view.rows[0].detail).toBe('todo dia 05 · Moradia');
  });

  it('sem data legível, o detalhe fica só com a categoria', () => {
    const view = buildRecurrencesView([e({ day: null, category: 'Saúde' })]);
    expect(view.rows[0].detail).toBe('Saúde');
  });

  it('a cor segue a categoria, não a posição na lista', () => {
    const primeiro = buildRecurrencesView([e({ id: 'a', category: 'Moradia' }), e({ id: 'b', category: 'Saúde' })]);
    const invertido = buildRecurrencesView([e({ id: 'b', category: 'Saúde' }), e({ id: 'a', category: 'Moradia' })]);
    const cor = (v: typeof primeiro, id: string) => v.rows.find((r) => r.id === id)!.colorIndex;
    expect(cor(primeiro, 'a')).toBe(cor(invertido, 'a'));
    expect(cor(primeiro, 'b')).toBe(cor(invertido, 'b'));
  });

  it('o peso na renda usa a renda recorrente, não a do período', () => {
    const view = buildRecurrencesView([
      e({ id: 'a', amount: 2000 }),
      e({ id: 'b', amount: 8000, direction: 'income' })
    ]);
    expect(view.outflowTotal).toBe(2000);
    expect(view.incomeTotal).toBe(8000);
    expect(view.incomeShare).toBe(25);
  });

  it('sem renda recorrente não inventa peso', () => {
    expect(buildRecurrencesView([e({ amount: 500 })]).incomeShare).toBeNull();
  });

  it('o próximo a vencer ignora o que já foi quitado', () => {
    const view = buildRecurrencesView([
      e({ id: 'pago', title: 'Aluguel', day: 1, settled: true }),
      e({ id: 'aberto', title: 'Energia', day: 10, settled: false })
    ]);
    expect(view.nextDue).toEqual({ title: 'Energia', day: 10 });
  });

  it('tudo quitado não deixa próximo a vencer', () => {
    expect(buildRecurrencesView([e({ settled: true })]).nextDue).toBeNull();
  });
});
