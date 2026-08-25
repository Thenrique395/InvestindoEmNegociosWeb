import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ApiDataService, StoredCard } from '../data/api-data.service';
import { CategoriesService } from '../categories.service';
import { LookupsService } from '../lookups.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { DespesaFormModalComponent } from './despesa-form-modal.component';
import { setLocaleSettings } from '../utils/locale-settings';

class ApiDataServiceMock {
  private readonly cardsSubject = new BehaviorSubject<StoredCard[]>([]);
  readonly cards$ = this.cardsSubject.asObservable();
  addExpense = jasmine.createSpy('addExpense').and.returnValue(of(void 0));
  emitCards(items: StoredCard[]): void { this.cardsSubject.next(items); }
}

class CategoriesServiceMock {
  list = jasmine.createSpy('list').and.returnValue(
    of([{ id: 'c1', name: 'Moradia', appliesTo: 'Expense', isActive: true }])
  );
}

class LookupsServiceMock {
  paymentMethods = () => of([{ id: 1, name: 'Pix' }]);
  cardBrands = () => of([{ id: 1, name: 'VISA', code: 'visa' }]);
}

class UiFeedbackServiceMock {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  info = jasmine.createSpy('info');
}

class RouterMock { navigateByUrl = jasmine.createSpy('navigateByUrl'); }

describe('DespesaFormModalComponent', () => {
  let component: DespesaFormModalComponent;
  let fixture: ComponentFixture<DespesaFormModalComponent>;
  let db: ApiDataServiceMock;

  beforeEach(async () => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });

    await TestBed.configureTestingModule({
      imports: [DespesaFormModalComponent],
      providers: [
        { provide: ApiDataService, useClass: ApiDataServiceMock },
        { provide: CategoriesService, useClass: CategoriesServiceMock },
        { provide: LookupsService, useClass: LookupsServiceMock },
        { provide: UiFeedbackService, useClass: UiFeedbackServiceMock },
        { provide: Router, useClass: RouterMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DespesaFormModalComponent);
    component = fixture.componentInstance;
    db = TestBed.inject(ApiDataService) as unknown as ApiDataServiceMock;
  });

  function preencher(): void {
    component.novaDespesa.nome = 'Energia';
    component.onValorChange('31842');
    component.novaDespesa.categoryId = 'c1';
    component.onVencimentoChange('10082026');
  }

  it('pré-preenche o vencimento com o dia recebido', () => {
    component.dataInicial = new Date(2026, 7, 10);
    component.ngOnInit();

    expect(component.vencimentoInput).toBe('10/08/2026');
  });

  it('grava e avisa quem chamou', () => {
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);
    component.ngOnInit();
    preencher();

    component.salvar();

    expect(db.addExpense).toHaveBeenCalledWith(
      jasmine.objectContaining({ nome: 'Energia', valor: 318.42, categoryId: 'c1', vencimento: '10/08/2026' })
    );
    expect(saved).toHaveBeenCalled();
  });

  it('recusa gravar sem nome, valor, categoria ou data válida', () => {
    component.ngOnInit();

    component.salvar();
    expect(db.addExpense).not.toHaveBeenCalled();

    component.novaDespesa.nome = 'Energia';
    component.salvar();
    expect(db.addExpense).not.toHaveBeenCalled();

    component.onValorChange('31842');
    component.salvar();
    expect(component.erroCategoria).toBeTruthy();

    component.novaDespesa.categoryId = 'c1';
    component.onVencimentoChange('99999999');
    component.salvar();
    expect(component.erroData).toBeTruthy();
    expect(db.addExpense).not.toHaveBeenCalled();
  });

  it('crédito desliga despesa fixa — a fatura já repete o lançamento', () => {
    db.emitCards([{ id: 'card1', bandeira: '1', numero: '1234567890123456' } as StoredCard]);
    component.ngOnInit();
    component.onFixaToggle(true);
    component.fixaMeses = 12;

    component.onFormaPagamentoChange('cartao');

    expect(component.fixa).toBeFalse();
    expect(component.fixaMeses).toBeNull();
    expect(component.cartaoSelecionadoId).toBe('card1');
  });

  it('voltar para à vista limpa cartão e parcelamento', () => {
    db.emitCards([{ id: 'card1', bandeira: '1', numero: '1234567890123456' } as StoredCard]);
    component.ngOnInit();
    component.onFormaPagamentoChange('cartao');
    component.parcelar = true;
    component.parcelasCount = 6;

    component.onFormaPagamentoChange('avista');

    expect(component.parcelar).toBeFalse();
    expect(component.parcelasCount).toBe(1);
    expect(component.cartaoSelecionadoId).toBeNull();
  });

  it('limita parcelas a 36 ao gravar', () => {
    db.emitCards([{ id: 'card1', bandeira: '1', numero: '1234567890123456' } as StoredCard]);
    component.ngOnInit();
    preencher();
    component.onFormaPagamentoChange('cartao');
    component.parcelar = true;
    component.parcelasCount = 999;

    component.salvar();

    expect(db.addExpense).toHaveBeenCalledWith(jasmine.objectContaining({ parcelasTotal: 36 }));
  });

  it('mostra o valor por parcela ao parcelar', () => {
    component.ngOnInit();
    component.onValorChange('120000');
    component.parcelar = true;
    component.parcelasCount = 4;

    expect(component.valorParcelaLabel).toBe('300,00');
  });

  it('cartão criado no meio do fluxo já volta escolhido', () => {
    component.ngOnInit();
    component.abrirCadastroCartao();
    expect(component.mostrarCartaoForm).toBeTrue();

    component.onCartaoCriado({ id: 'novo' } as never);

    expect(component.mostrarCartaoForm).toBeFalse();
    expect(component.cartaoSelecionadoId).toBe('novo');
    expect(component.formaPagamento).toBe('cartao');
  });

  it('não avisa quem chamou quando a gravação falha', () => {
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);
    db.addExpense.and.returnValue(throwError(() => new Error('falhou')));
    component.ngOnInit();
    preencher();

    component.salvar();

    expect(saved).not.toHaveBeenCalled();
    expect(component.saving).toBeFalse();
  });
});
