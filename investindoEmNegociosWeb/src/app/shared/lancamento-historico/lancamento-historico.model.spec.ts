import {
  describeHistoryEvent,
  formatEventMoment,
  HistoryEvent,
  installmentProgress,
  installmentTone
} from './lancamento-historico.model';

const evento = (patch: Partial<HistoryEvent> = {}): HistoryEvent => ({
  type: 'Created',
  occurredAt: '2026-08-01T09:14:00',
  actorName: 'Henrique Santos',
  derived: false,
  ...patch
});

describe('histórico do lançamento — apresentação', () => {
  it('mostra data, hora e quem fez', () => {
    const view = describeHistoryEvent(evento());
    expect(view.label).toBe('Lançamento criado');
    expect(view.detail).toContain('01/08/2026');
    expect(view.detail).toContain('09:14');
    expect(view.detail).toContain('Henrique Santos');
  });

  it('sem autor, atribui ao sistema', () => {
    const view = describeHistoryEvent(evento({ type: 'DueDatePassed', actorName: null }));
    expect(view.label).toBe('Vencimento ultrapassado');
    expect(view.detail).toContain('sistema');
    expect(view.tone).toBe('danger');
  });

  it('valor alterado diz de quanto para quanto', () => {
    const view = describeHistoryEvent(evento({ type: 'AmountChanged', oldValue: '860.00', newValue: '892.00' }));
    expect(view.detail).toContain('860,00');
    expect(view.detail).toContain('892,00');
    expect(view.tone).toBe('warning');
  });

  it('categoria definida mostra o nome da categoria', () => {
    const view = describeHistoryEvent(evento({ type: 'CategoryChanged', newValue: 'Saúde' }));
    expect(view.label).toBe('Categoria definida');
    expect(view.detail).toContain('Saúde');
  });

  it('vencimento alterado converte as datas ISO', () => {
    const view = describeHistoryEvent(
      evento({ type: 'DueDateChanged', oldValue: '2026-08-01', newValue: '2026-08-10' })
    );
    expect(view.detail).toContain('01/08/2026');
    expect(view.detail).toContain('10/08/2026');
  });

  it('cita a parcela quando o evento é de uma delas', () => {
    const view = describeHistoryEvent(evento({ type: 'PaymentRegistered', newValue: '389.40', installmentNo: 7 }));
    expect(view.detail).toContain('389,40');
    expect(view.detail).toContain('parcela 7');
  });

  it('tipo desconhecido não quebra a tela', () => {
    const view = describeHistoryEvent(evento({ type: 'AlgoNovoDoBackend' }));
    expect(view.label).toBe('AlgoNovoDoBackend');
    expect(view.tone).toBe('muted');
  });

  it('data ilegível volta como veio', () => {
    expect(formatEventMoment('sem data')).toBe('sem data');
  });
});

describe('histórico do lançamento — progresso das parcelas', () => {
  const parcela = (numero: number, status: string) => ({
    id: `i${numero}`,
    numero,
    total: 12,
    vencimento: '25/08/2026',
    valor: 389.4,
    status
  });

  it('conta as pagas e calcula o percentual', () => {
    const progresso = installmentProgress([
      parcela(1, 'PAID'),
      parcela(2, 'PAID'),
      parcela(3, 'OPEN'),
      parcela(4, 'OPEN')
    ]);

    expect(progresso.pagas).toBe(2);
    expect(progresso.total).toBe(4);
    expect(progresso.percentual).toBe(50);
    expect(progresso.label).toBe('2 de 4 parcelas pagas');
  });

  it('parcialmente paga não conta como paga', () => {
    const progresso = installmentProgress([parcela(1, 'PARTIALLY_PAID'), parcela(2, 'OPEN')]);
    expect(progresso.pagas).toBe(0);
  });

  it('antecipada conta como paga', () => {
    const progresso = installmentProgress([parcela(1, 'ANTICIPATED'), parcela(2, 'OPEN')]);
    expect(progresso.pagas).toBe(1);
  });

  it('sem parcelas, não divide por zero', () => {
    const progresso = installmentProgress([]);
    expect(progresso.percentual).toBe(0);
    expect(progresso.label).toBe('Sem parcelas');
  });

  it('o tom da parcela acompanha o status', () => {
    expect(installmentTone('PAID')).toBe('success');
    expect(installmentTone('PARTIALLY_PAID')).toBe('warning');
    expect(installmentTone('OPEN')).toBe('muted');
  });
});
