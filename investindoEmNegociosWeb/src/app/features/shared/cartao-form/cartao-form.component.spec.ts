import { TestBed } from '@angular/core/testing';
import { CartaoFormComponent } from './cartao-form.component';
import { StoredCard } from '../../../core/data/api-data.service';

function buildComponent(cardsStoreMock: any = {}) {
  const cardsStore = {
    create: jasmine.createSpy('create'),
    update: jasmine.createSpy('update'),
    ...cardsStoreMock
  };
  const lookupsStore = {
    cardBrands: () => [{ id: 1, name: 'Visa', code: 'VISA', isActive: true }],
    institutions: () => [],
    loadCardBrands: jasmine.createSpy('loadCardBrands'),
    loadInstitutions: jasmine.createSpy('loadInstitutions')
  };
  const uiFeedback = {
    success: jasmine.createSpy('success'),
    warning: jasmine.createSpy('warning'),
    error: jasmine.createSpy('error'),
    info: jasmine.createSpy('info')
  };

  const component = TestBed.runInInjectionContext(
    () => new CartaoFormComponent(
      lookupsStore as any,
      cardsStore as any,
      uiFeedback as any,
      { markForCheck: jasmine.createSpy('markForCheck') } as any
    )
  );

  return { component, cardsStore, lookupsStore, uiFeedback };
}

function abrir(component: CartaoFormComponent, card: StoredCard | null = null): void {
  component.card = card;
  component.open = true;
  component.ngOnChanges({ open: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true } } as any);
}

describe('CartaoFormComponent', () => {
  it('cria o cartão e devolve o registro salvo a quem abriu o modal', () => {
    const cardCriado = { id: 'card-novo', brandId: 1, nickname: 'Nubank pessoal', last4: '4321' };
    const { component, cardsStore } = buildComponent({
      create: jasmine.createSpy('create').and.callFake((_payload: any, onSuccess: any) => onSuccess(cardCriado))
    });
    const salvos: any[] = [];
    component.saved.subscribe((card) => salvos.push(card));

    abrir(component);
    component.bandeira = '1';
    component.numero = '4821';
    component.nome = 'Nubank pessoal';
    component.banco = 'Nu Pagamentos';
    component.onLimiteChange('1800000');
    component.salvar();

    expect(cardsStore.create).toHaveBeenCalled();
    const payload = cardsStore.create.calls.mostRecent().args[0];
    expect(payload.last4).toBe('4821');
    expect(payload.nickname).toBe('Nubank pessoal');
    // titular não é mais pedido: vai o próprio nome do cartão
    expect(payload.holderName).toBe('Nubank pessoal');
    expect(payload.creditLimit).toBe(18000);
    expect(salvos).toEqual([cardCriado]);
  });

  it('preserva o titular já gravado quando edita um cartão antigo', () => {
    const { component, cardsStore } = buildComponent();

    abrir(component, {
      id: 'c1',
      bandeira: '1',
      numero: '9999',
      nome: 'Nubank pessoal',
      holderName: 'HENRIQUE SANTOS',
      banco: 'Nu Pagamentos',
      limiteCredito: 5000,
      diaFechamento: 8,
      diaVencimento: 18
    });
    component.salvar();

    const payload = cardsStore.update.calls.mostRecent().args[1];
    expect(payload.holderName).toBe('HENRIQUE SANTOS');
    expect(payload.nickname).toBe('Nubank pessoal');
  });

  it('sugere comprar logo após o fechamento', () => {
    const { component } = buildComponent();

    abrir(component);
    component.diaFechamento = 8;
    expect(component.melhorDiaDeCompra).toBe(9);

    component.diaFechamento = 31;
    expect(component.melhorDiaDeCompra).toBe(1);
  });

  it('só libera o salvar quando nome, bandeira, 4 dígitos e limite estão preenchidos', () => {
    const { component } = buildComponent();

    abrir(component);
    component.bandeira = '1';
    expect(component.podeSalvar).toBeFalse();

    component.nome = 'Nubank pessoal';
    component.numero = '482'; // ainda incompleto
    component.onLimiteChange('1800000');
    expect(component.podeSalvar).toBeFalse();

    component.numero = '4821';
    expect(component.podeSalvar).toBeTrue();
  });

  it('permite salvar edição com o cartão carregado do last4 — trava regressão do bug de edição', () => {
    const { component, cardsStore } = buildComponent();

    abrir(component, {
      id: 'c1',
      bandeira: '1',
      numero: '9999',
      nome: 'Meu Cartão',
      holderName: 'FULANO DE TAL',
      banco: 'Banco X',
      limiteCredito: 5000,
      diaFechamento: 10,
      diaVencimento: 18
    });
    expect(component.numero).toBe('9999');
    component.limiteCredito = 8000; // usuário altera apenas o limite
    component.salvar();

    expect(cardsStore.update).toHaveBeenCalled();
    const [id, payload] = cardsStore.update.calls.mostRecent().args;
    expect(id).toBe('c1');
    expect(payload.creditLimit).toBe(8000);
  });

  it('não envia nada quando o formulário está incompleto', () => {
    const { component, cardsStore, uiFeedback } = buildComponent();

    abrir(component);
    component.salvar();

    expect(cardsStore.create).not.toHaveBeenCalled();
    expect(uiFeedback.warning).toHaveBeenCalled();
  });

  it('cada abertura começa limpa — o modal é reaproveitado entre telas', () => {
    const { component } = buildComponent();

    abrir(component);
    component.nome = 'RASCUNHO ANTIGO';
    component.numero = '4821';

    abrir(component);

    expect(component.nome).toBe('');
    expect(component.numero).toBe('');
    expect(component.isEdit).toBeFalse();
  });
});
