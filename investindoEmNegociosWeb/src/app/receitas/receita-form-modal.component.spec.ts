import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ApiDataService, StoredIncome } from '../data/api-data.service';
import { CategoriesService } from '../categories.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { ReceitaFormModalComponent } from './receita-form-modal.component';
import { setLocaleSettings } from '../utils/locale-settings';

class ApiDataServiceMock {
  private readonly incomesSubject = new BehaviorSubject<StoredIncome[]>([]);
  readonly incomes$ = this.incomesSubject.asObservable();
  addIncome = jasmine.createSpy('addIncome').and.returnValue(of(void 0));
  emitIncomes(items: StoredIncome[]): void { this.incomesSubject.next(items); }
}

class CategoriesServiceMock {
  list = jasmine.createSpy('list').and.returnValue(
    of([{ id: 'c1', name: 'Salário', appliesTo: 'Income', isActive: true }])
  );
}

class UiFeedbackServiceMock {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  info = jasmine.createSpy('info');
}

class RouterMock { navigateByUrl = jasmine.createSpy('navigateByUrl'); }

describe('ReceitaFormModalComponent', () => {
  let component: ReceitaFormModalComponent;
  let fixture: ComponentFixture<ReceitaFormModalComponent>;
  let db: ApiDataServiceMock;
  let feedback: UiFeedbackServiceMock;

  beforeEach(async () => {
    setLocaleSettings({ locale: 'pt-BR', currency: 'BRL' });

    await TestBed.configureTestingModule({
      imports: [ReceitaFormModalComponent],
      providers: [
        { provide: ApiDataService, useClass: ApiDataServiceMock },
        { provide: CategoriesService, useClass: CategoriesServiceMock },
        { provide: UiFeedbackService, useClass: UiFeedbackServiceMock },
        { provide: Router, useClass: RouterMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReceitaFormModalComponent);
    component = fixture.componentInstance;
    db = TestBed.inject(ApiDataService) as unknown as ApiDataServiceMock;
    feedback = TestBed.inject(UiFeedbackService) as unknown as UiFeedbackServiceMock;
  });

  /** Preenche o formulário com um lançamento válido. */
  function preencher(): void {
    component.onFonteChange('Consultoria');
    component.onValorChange('150000');
    component.novaRenda.categoryId = 'c1';
    component.onRecebimentoChange('15082026');
  }

  it('pré-preenche a data com o dia recebido', () => {
    component.dataInicial = new Date(2026, 7, 15);
    component.ngOnInit();

    expect(component.recebimentoInput).toBe('15/08/2026');
  });

  it('só busca categorias quando é montado, não antes', () => {
    const categorias = TestBed.inject(CategoriesService) as unknown as CategoriesServiceMock;
    // Quem usa renderiza sob @if, então criar o componente não pode custar
    // requisição: a busca só sai quando o modal de fato entra na tela.
    expect(categorias.list).not.toHaveBeenCalled();

    component.ngOnInit();

    expect(categorias.list).toHaveBeenCalledTimes(1);
  });

  it('pré-preenche a data mesmo com [open] declarado antes de [dataInicial]', () => {
    // O Angular atribui os inputs na ordem do template. Este teste trava o bug
    // que existiu: inicializar no setter de `open` rodava com dataInicial nulo.
    component.open = true;
    component.dataInicial = new Date(2026, 7, 15);
    component.ngOnInit();

    expect(component.recebimentoInput).toBe('15/08/2026');
  });

  it('recusa gravar sem fonte', () => {
    component.ngOnInit();
    component.onValorChange('10000');

    component.salvar();

    expect(db.addIncome).not.toHaveBeenCalled();
    expect(feedback.error).toHaveBeenCalled();
  });

  it('recusa gravar sem valor', () => {
    component.ngOnInit();
    component.onFonteChange('Consultoria');

    component.salvar();

    expect(db.addIncome).not.toHaveBeenCalled();
  });

  it('exige categoria e data válida antes de gravar', () => {
    component.ngOnInit();
    component.onFonteChange('Consultoria');
    component.onValorChange('150000');

    component.salvar();
    expect(component.erroCategoria).toBeTruthy();
    expect(db.addIncome).not.toHaveBeenCalled();

    component.novaRenda.categoryId = 'c1';
    component.onRecebimentoChange('99999999');
    component.salvar();
    expect(component.erroData).toBeTruthy();
    expect(db.addIncome).not.toHaveBeenCalled();
  });

  it('grava e avisa quem chamou', () => {
    const saved = jasmine.createSpy('saved');
    const closed = jasmine.createSpy('closed');
    component.saved.subscribe(saved);
    component.close.subscribe(closed);
    component.ngOnInit();
    preencher();

    component.salvar();

    expect(db.addIncome).toHaveBeenCalledWith(
      jasmine.objectContaining({ fonte: 'Consultoria', valor: 1500, categoryId: 'c1', recebimento: '15/08/2026' })
    );
    expect(saved).toHaveBeenCalled();
    expect(closed).toHaveBeenCalled();
    expect(component.saving).toBeFalse();
  });

  it('não fecha nem avisa quando a gravação falha', () => {
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);
    db.addIncome.and.returnValue(throwError(() => new Error('falhou')));
    component.ngOnInit();
    preencher();

    component.salvar();

    expect(saved).not.toHaveBeenCalled();
    expect(feedback.error).toHaveBeenCalled();
    expect(component.saving).toBeFalse();
  });

  it('sugere o último valor lançado para a mesma fonte', () => {
    db.emitIncomes([
      { id: '1', planId: 'p1', fonte: 'Consultoria', categoria: '', categoryId: 'c1', valor: 800, recebimento: '10/07/2026', fixa: false, fixaInicio: '' },
      { id: '2', planId: 'p2', fonte: 'Consultoria', categoria: '', categoryId: 'c1', valor: 1200, recebimento: '10/08/2026', fixa: false, fixaInicio: '' }
    ] as StoredIncome[]);
    component.ngOnInit();

    component.onFonteChange('consultoria');

    expect(component.valorSugestao()).toBe(1200);
  });

  it('ignora fechar enquanto grava', () => {
    const closed = jasmine.createSpy('closed');
    component.close.subscribe(closed);
    component.saving = true;

    component.fechar();

    expect(closed).not.toHaveBeenCalled();
  });
});
