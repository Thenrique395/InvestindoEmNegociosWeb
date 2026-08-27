import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { Goal, GoalsService } from '../../../core/goals.service';
import { CategoriesStore } from '../../../core/categories.store';
import { UiFeedbackService } from '../../../core/ui-feedback.service';
import { MetaFormModalComponent } from './meta-form-modal.component';

class CategoriesStoreMock {
  private readonly items = signal([
    { id: 'e1', name: 'Moradia', appliesTo: 'Expense', isActive: true },
    { id: 'i1', name: 'Salário', appliesTo: 'Income', isActive: true }
  ]);
  readonly categories = this.items;
  load = jasmine.createSpy('load');
}

class UiFeedbackServiceMock {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  warning = jasmine.createSpy('warning');
  info = jasmine.createSpy('info');
}

describe('MetaFormModalComponent', () => {
  let component: MetaFormModalComponent;
  let fixture: ComponentFixture<MetaFormModalComponent>;
  let goalsService: jasmine.SpyObj<Pick<GoalsService, 'create' | 'update'>>;
  let feedback: UiFeedbackServiceMock;

  function montar(goal: Goal | null = null): void {
    fixture = TestBed.createComponent(MetaFormModalComponent);
    component = fixture.componentInstance;
    component.goal = goal;
    component.ngOnInit();
  }

  beforeEach(async () => {
    goalsService = jasmine.createSpyObj('GoalsService', ['create', 'update']);
    goalsService.create.and.returnValue(of({ id: 'g1' } as Goal));
    goalsService.update.and.returnValue(of({ id: 'g1' } as Goal));

    await TestBed.configureTestingModule({
      imports: [MetaFormModalComponent],
      providers: [
        { provide: GoalsService, useValue: goalsService },
        { provide: CategoriesStore, useClass: CategoriesStoreMock },
        { provide: UiFeedbackService, useClass: UiFeedbackServiceMock }
      ]
    }).compileComponents();

    feedback = TestBed.inject(UiFeedbackService) as unknown as UiFeedbackServiceMock;
  });

  it('exige nome e valor-alvo', () => {
    montar();

    component.salvar();
    expect(goalsService.create).not.toHaveBeenCalled();

    component.form.title = 'Reserva';
    component.salvar();
    expect(goalsService.create).not.toHaveBeenCalled();
    expect(feedback.warning).toHaveBeenCalled();
  });

  it('despesa vira Limit e receita vira Target', () => {
    montar();
    component.form.title = 'Alimentação';
    component.form.targetAmount = '800';

    component.salvar();
    expect(goalsService.create).toHaveBeenCalledWith(jasmine.objectContaining({ mode: 'Limit' }));

    goalsService.create.calls.reset();
    montar();
    component.setFormKind('Income');
    component.form.title = 'Freelas';
    component.form.targetAmount = '2000';

    component.salvar();
    expect(goalsService.create).toHaveBeenCalledWith(jasmine.objectContaining({ mode: 'Target' }));
  });

  it('investimento não usa categoria de consumo', () => {
    montar();

    component.setFormKind('Investment');

    expect(component.isInvestmentForm).toBeTrue();
    expect(component.categoryOptions).toEqual([]);
    expect(component.form.categoryId).toBe('');
  });

  it('oferece só as categorias do tipo escolhido', () => {
    montar();

    expect(component.categoryOptions.map((c) => c.id)).toEqual(['e1']);

    component.setFormKind('Income');
    expect(component.categoryOptions.map((c) => c.id)).toEqual(['i1']);
  });

  it('edita quando recebe uma meta, preservando o status', () => {
    montar({
      id: 'g1', title: 'Reserva', targetAmount: 5000, kind: 'Investment',
      status: 'Paused', startDate: '2026-01-01', endDate: '2026-12-31'
    } as Goal);

    expect(component.form.title).toBe('Reserva');

    component.salvar();

    expect(goalsService.update).toHaveBeenCalledWith('g1', jasmine.objectContaining({ status: 'Paused' }));
    expect(goalsService.create).not.toHaveBeenCalled();
  });

  it('avisa quem chamou ao gravar', () => {
    const saved = jasmine.createSpy('saved');
    montar();
    component.saved.subscribe(saved);
    component.form.title = 'Reserva';
    component.form.targetAmount = '5000';

    component.salvar();

    expect(saved).toHaveBeenCalled();
    expect(component.saving()).toBeFalse();
  });

  it('não avisa quem chamou quando falha', () => {
    const saved = jasmine.createSpy('saved');
    goalsService.create.and.returnValue(throwError(() => new Error('falhou')));
    montar();
    component.saved.subscribe(saved);
    component.form.title = 'Reserva';
    component.form.targetAmount = '5000';

    component.salvar();

    expect(saved).not.toHaveBeenCalled();
    expect(feedback.error).toHaveBeenCalled();
    expect(component.saving()).toBeFalse();
  });
});
