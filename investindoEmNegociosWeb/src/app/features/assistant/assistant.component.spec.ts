import { of, throwError } from 'rxjs';
import { AssistantComponent } from './assistant.component';

function contextObj(score = 20) {
  return {
    realBalance: { realAvailableBalance: 2000 },
    debts: { totalDebt: 500 },
    netWorth: { netWorth: 8000 },
    risk: { score },
    governanceSummary: 'Resumo de governança'
  } as any;
}

function createComponent(overrides?: { service?: any }) {
  const service = overrides?.service ?? {
    conversation: [],
    context: jasmine.createSpy('context').and.returnValue(of(contextObj())),
    chat: jasmine.createSpy('chat').and.returnValue(of({ question: 'q', answer: 'a', disclaimer: 'd', context: contextObj(70) })),
    addMessage: jasmine.createSpy('addMessage')
  };
  const cdr = { markForCheck: jasmine.createSpy('markForCheck') } as any;
  const destroyRef = { onDestroy: () => {} } as any;
  return { component: new AssistantComponent(service, cdr, destroyRef), service };
}

describe('AssistantComponent', () => {
  it('carrega o contexto ao iniciar', () => {
    const { component, service } = createComponent();

    component.ngOnInit();

    expect(service.context).toHaveBeenCalled();
    expect(component.context()?.risk.score).toBe(20);
    expect(component.loading()).toBeFalse();
  });

  it('sinaliza erro quando o contexto falha', () => {
    const { component } = createComponent({
      service: {
        conversation: [],
        context: jasmine.createSpy().and.returnValue(throwError(() => ({ error: { detail: 'boom' } })))
      }
    });

    component.load();

    expect(component.error()).toBe('boom');
    expect(component.loading()).toBeFalse();
  });

  it('não envia pergunta em branco', () => {
    const { component, service } = createComponent();
    component.question.set('   ');

    component.send();

    expect(service.chat).not.toHaveBeenCalled();
  });

  it('envia a pergunta e atualiza o contexto da resposta', () => {
    const { component, service } = createComponent();
    component.question.set('Qual meu risco?');

    component.send();

    expect(service.chat).toHaveBeenCalledWith('Qual meu risco?');
    expect(service.addMessage).toHaveBeenCalled();
    expect(component.context()?.risk.score).toBe(70);
    expect(component.question()).toBe('');
    expect(component.sending()).toBeFalse();
  });

  it('deriva o tom do risco a partir do contexto', () => {
    const { component } = createComponent();
    component.context.set(contextObj(80));
    expect(component.riskTone).toBe('danger');

    component.context.set(contextObj(10));
    expect(component.riskTone).toBe('success');
  });
});
