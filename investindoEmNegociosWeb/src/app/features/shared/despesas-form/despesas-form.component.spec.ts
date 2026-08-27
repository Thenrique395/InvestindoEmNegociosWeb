import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DespesasFormComponent } from './despesas-form.component';
import { SelectMenuComponent } from '../../../shared/select-menu/select-menu.component';
import { createExpenseDraft } from '../../../core/onboarding.helpers';

/** O select de categoria só oferece "Criar nova categoria" quando a tela permite. */
describe('DespesasFormComponent — atalho de criar categoria', () => {
  let fixture: ComponentFixture<DespesasFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DespesasFormComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DespesasFormComponent);
    fixture.componentInstance.mostrarForm = true;
    fixture.componentInstance.novaDespesa = createExpenseDraft();
    fixture.componentInstance.categorias = [{ id: 'cat-1', name: 'Mercado' } as never];
  });

  function selectDeCategoria(): SelectMenuComponent {
    const selects = fixture.debugElement
      .queryAll((node) => node.componentInstance instanceof SelectMenuComponent)
      .map((node) => node.componentInstance as SelectMenuComponent);
    return selects.find((s) => s.ariaLabel() === 'Categoria da despesa')!;
  }

  it('oferece criar categoria por padrão — é o comportamento da tela de Despesas', () => {
    fixture.detectChanges();

    expect(selectDeCategoria().createLabel()).toBe('Criar nova categoria');
  });

  it('esconde o atalho quando a tela não permite — no onboarding sair daqui perderia o preenchido', () => {
    fixture.componentInstance.permiteCriarCategoria = false;
    fixture.detectChanges();

    expect(selectDeCategoria().createLabel()).toBeNull();
  });
});
