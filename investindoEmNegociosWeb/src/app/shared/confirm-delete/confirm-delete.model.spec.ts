import { buildDeleteConfirmView, deleteConfirmCta } from './confirm-delete.model';

describe('diálogo de exclusão de lançamento', () => {
  it('lançamento simples não oferece escopo', () => {
    const view = buildDeleteConfirmView('single', 'despesa');
    expect(view.title).toBe('Excluir lançamento?');
    expect(view.note).toBe('Essa ação não pode ser desfeita.');
    expect(view.options).toEqual([]);
    expect(deleteConfirmCta('single', 'single')).toBe('Excluir');
  });

  it('recorrente pergunta entre o mês e a recorrência', () => {
    const view = buildDeleteConfirmView('recurring', 'despesa');
    expect(view.title).toBe('Excluir este mês ou a recorrência?');
    expect(view.note).toContain('Esta despesa é recorrente');
    expect(view.options.map((o) => o.label)).toEqual(['Somente este mês', 'Encerrar recorrência']);
    expect(deleteConfirmCta('recurring', 'single')).toBe('Excluir apenas esta');
    expect(deleteConfirmCta('recurring', 'all')).toBe('Encerrar recorrência');
  });

  it('série pergunta entre a parcela e a série', () => {
    const view = buildDeleteConfirmView('series', 'receita');
    expect(view.title).toBe('Excluir parcela ou série?');
    expect(view.note).toContain('Esta receita faz parte de uma série');
    expect(view.options.map((o) => o.label)).toEqual(['Somente esta parcela', 'Todas as parcelas']);
    expect(deleteConfirmCta('series', 'all')).toBe('Excluir série');
  });

  it('o substantivo acompanha a tela', () => {
    expect(buildDeleteConfirmView('recurring', 'receita').note).toContain('Esta receita é recorrente');
  });
});
