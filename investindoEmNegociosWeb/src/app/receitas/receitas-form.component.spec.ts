import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReceitasFormComponent } from './receitas-form.component';
import { SelectMenuComponent } from '../shared/select-menu/select-menu.component';
import { createIncomeDraft } from '../onboarding/onboarding.helpers';

/** O select de categoria só oferece "Criar nova categoria" quando a tela permite. */
describe('ReceitasFormComponent — atalho de criar categoria', () => {
  let fixture: ComponentFixture<ReceitasFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceitasFormComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ReceitasFormComponent);
    fixture.componentInstance.mostrarForm = true;
    fixture.componentInstance.novaRenda = createIncomeDraft();
    fixture.componentInstance.categorias = [{ id: 'cat-1', name: 'Salário' } as never];
  });

  function selectDeCategoria(): SelectMenuComponent {
    return fixture.debugElement
      .queryAll((node) => node.componentInstance instanceof SelectMenuComponent)
      .map((node) => node.componentInstance as SelectMenuComponent)
      .find((s) => s.ariaLabel() === 'Categoria da receita')!;
  }

  it('oferece criar categoria por padrão — é o comportamento da tela de Receitas', () => {
    fixture.detectChanges();

    expect(selectDeCategoria().createLabel()).toBe('Criar nova categoria');
  });

  it('esconde o atalho quando a tela não permite — no onboarding só se usa o que já existe', () => {
    fixture.componentInstance.permiteCriarCategoria = false;
    fixture.detectChanges();

    expect(selectDeCategoria().createLabel()).toBeNull();
  });
});
