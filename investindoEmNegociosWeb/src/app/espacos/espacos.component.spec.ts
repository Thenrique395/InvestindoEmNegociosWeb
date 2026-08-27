import { Subject, of, throwError } from 'rxjs';
import { EspacosComponent } from './espacos.component';
import { SpaceResponse } from '../spaces.service';

class SpacesServiceMock {
  list = jasmine.createSpy('list').and.returnValue(of([]));
  create = jasmine.createSpy('create').and.returnValue(of({}));
  update = jasmine.createSpy('update').and.returnValue(of({}));
  delete = jasmine.createSpy('delete').and.returnValue(of(undefined));
  enter = jasmine.createSpy('enter').and.returnValue(of({}));
}

class UiFeedbackServiceMock {
  success = jasmine.createSpy('success');
  warning = jasmine.createSpy('warning');
  error = jasmine.createSpy('error');
  info = jasmine.createSpy('info');
}

function buildSpace(overrides: Partial<SpaceResponse> = {}): SpaceResponse {
  return {
    id: 's1',
    name: 'Espaço Principal',
    isDefault: true,
    hasPassword: false,
    createdAt: '2026-06-01T00:00:00Z',
    ...overrides
  };
}

function createComponent() {
  const spacesService = new SpacesServiceMock();
  const uiFeedback = new UiFeedbackServiceMock();
  const component = new EspacosComponent(spacesService as any, uiFeedback as any, { onDestroy: () => {} } as any);
  return { component, spacesService, uiFeedback };
}

describe('EspacosComponent', () => {
  it('carrega a lista de espaços ao iniciar', () => {
    const { component, spacesService } = createComponent();
    spacesService.list.and.returnValue(of([buildSpace(), buildSpace({ id: 's2', name: 'Negócio', isDefault: false })]));

    component.ngOnInit();

    expect(component.spaces().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('avisa quando tenta criar espaço sem nome', () => {
    const { component, spacesService, uiFeedback } = createComponent();
    component.novoNome.set('   ');

    component.criar();

    expect(uiFeedback.warning).toHaveBeenCalled();
    expect(spacesService.create).not.toHaveBeenCalled();
  });

  it('cria um espaço novo, limpa o formulário e recarrega a lista', () => {
    const { component, spacesService, uiFeedback } = createComponent();
    component.novoNome.set('Negócio');
    component.novaSenha.set('segredo');

    component.criar();

    expect(spacesService.create).toHaveBeenCalledWith({ name: 'Negócio', password: 'segredo' });
    expect(component.novoNome()).toBe('');
    expect(component.novaSenha()).toBe('');
    expect(uiFeedback.success).toHaveBeenCalled();
    expect(spacesService.list).toHaveBeenCalled();
  });

  it('mostra erro quando a criação falha', () => {
    const { component, spacesService, uiFeedback } = createComponent();
    spacesService.create.and.returnValue(throwError(() => new Error('falhou')));
    component.novoNome.set('Negócio');

    component.criar();

    expect(component.saving()).toBeFalse();
    expect(uiFeedback.error).toHaveBeenCalled();
  });

  it('abre o prompt de senha ao entrar em um espaço protegido', () => {
    const { component, spacesService } = createComponent();
    const protegido = buildSpace({ id: 's2', name: 'Negócio', isDefault: false, hasPassword: true });

    component.entrar(protegido);

    expect(component.passwordPromptId()).toBe('s2');
    expect(component.passwordPromptLabel()).toBe('Senha do espaço "Negócio"');
    expect(spacesService.enter).not.toHaveBeenCalled();
  });

  it('entra direto em um espaço sem senha', () => {
    const { component, spacesService } = createComponent();
    // o subject nunca emite: evita disparar o redirecionamento real de window.location no teste
    spacesService.enter.and.returnValue(new Subject());
    const semSenha = buildSpace({ id: 's1', hasPassword: false });

    component.entrar(semSenha);

    expect(spacesService.enter).toHaveBeenCalledWith('s1', { password: null });
    expect(component.enteringId()).toBe('s1');
  });

  it('mostra erro de senha inválida no prompt sem recarregar a página', () => {
    const { component, spacesService } = createComponent();
    spacesService.enter.and.returnValue(throwError(() => ({ error: { detail: 'Senha incorreta.' } })));
    const protegido = buildSpace({ id: 's2', name: 'Negócio', hasPassword: true });
    component.entrar(protegido);
    component.passwordPromptValue.set('errada');

    component.confirmarSenhaPrompt();

    expect(component.passwordPromptError()).toBe('Senha incorreta.');
    expect(component.enteringId()).toBeNull();
  });

  it('abre a confirmação de exclusão sem excluir de imediato', () => {
    const { component, spacesService } = createComponent();
    const space = buildSpace({ id: 's2', name: 'Negócio', isDefault: false });

    component.excluir(space);

    expect(component.spaceToDelete()).toEqual(space);
    expect(spacesService.delete).not.toHaveBeenCalled();
  });

  it('cancela a exclusão quando o usuário não confirma', () => {
    const { component, spacesService } = createComponent();
    component.excluir(buildSpace({ id: 's2', name: 'Negócio', isDefault: false }));

    component.cancelarExclusao();

    expect(component.spaceToDelete()).toBeNull();
    expect(spacesService.delete).not.toHaveBeenCalled();
  });

  it('exclui o espaço após confirmação e recarrega a lista', () => {
    const { component, spacesService, uiFeedback } = createComponent();
    component.excluir(buildSpace({ id: 's2', name: 'Negócio', isDefault: false }));

    component.confirmarExclusao();

    expect(spacesService.delete).toHaveBeenCalledWith('s2');
    expect(component.spaceToDelete()).toBeNull();
    expect(uiFeedback.success).toHaveBeenCalled();
    expect(spacesService.list).toHaveBeenCalled();
  });
});
