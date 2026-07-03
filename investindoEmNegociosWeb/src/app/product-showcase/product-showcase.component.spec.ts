import { ProductShowcaseComponent } from './product-showcase.component';

describe('ProductShowcaseComponent', () => {
  let component: ProductShowcaseComponent;

  beforeEach(() => {
    component = new ProductShowcaseComponent();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('inicia com a primeira prévia ativa e sem pausa', () => {
    expect(component['activePreviewIndex']).toBe(0);
    expect(component['previewPaused']).toBeFalse();
  });

  it('seleciona uma prévia específica', () => {
    component['selectPreview'](2);
    expect(component['activePreviewIndex']).toBe(2);
  });

  it('pausa e retoma a rotação automática', () => {
    component['pausePreview']();
    expect(component['previewPaused']).toBeTrue();

    component['resumePreview']();
    expect(component['previewPaused']).toBeFalse();
  });

  it('avança a prévia automaticamente enquanto não pausado', () => {
    jasmine.clock().install();
    try {
      component.ngOnInit();
      expect(component['activePreviewIndex']).toBe(0);

      jasmine.clock().tick(6500);
      expect(component['activePreviewIndex']).toBe(1);

      jasmine.clock().tick(6500);
      expect(component['activePreviewIndex']).toBe(2);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('não avança a prévia automaticamente quando pausado', () => {
    jasmine.clock().install();
    try {
      component.ngOnInit();
      component['pausePreview']();

      jasmine.clock().tick(6500);
      expect(component['activePreviewIndex']).toBe(0);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('mapeia cada módulo de persona para a variante de tag correta', () => {
    expect(component['tagVariant']('Receitas')).toBe('tag--income');
    expect(component['tagVariant']('Cartões')).toBe('tag--expense');
    expect(component['tagVariant']('Investimentos')).toBe('tag--investment');
    expect(component['tagVariant']('Metas')).toBe('tag--organize');
  });

  it('usa tag--organize como padrão para módulos desconhecidos', () => {
    expect(component['tagVariant']('Módulo inexistente')).toBe('tag--organize');
  });

  it('define um par de dor/solução para cada dor listada, na mesma ordem', () => {
    expect(component['painSolutionPairs'].length).toBeGreaterThan(0);
    component['painSolutionPairs'].forEach((pair) => {
      expect(pair.pain).toBeTruthy();
      expect(pair.solution).toBeTruthy();
    });
  });

  it('não lança erro ao destruir sem ter iniciado o timer', () => {
    const freshComponent = new ProductShowcaseComponent();
    expect(() => freshComponent.ngOnDestroy()).not.toThrow();
  });
});
