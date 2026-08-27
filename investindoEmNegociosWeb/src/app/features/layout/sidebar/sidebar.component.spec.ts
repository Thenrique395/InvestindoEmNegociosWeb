import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { UserRole } from '../../../core/roles';

describe('SidebarComponent — visibilidade por role/feature', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])]
    });
  });

  function labelsFor(role: UserRole | null): string[] {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.componentRef.setInput('brandName', 'Teste');
    fixture.componentRef.setInput('currentRole', role);
    return fixture.componentInstance
      .visibleSections()
      .flatMap((s) => s.items.map((i) => i.label));
  }

  it('Basic vê Categorias, mas não itens premium nem admin', () => {
    const l = labelsFor('Basic');
    expect(l).toContain('Categorias');
    expect(l).not.toContain('Orçamento');
    expect(l).not.toContain('Investimentos');
    expect(l).not.toContain('Relatórios');
    expect(l).not.toContain('Usuários');
  });

  it('Intermediate vê Orçamento/Simulador/Relatórios, mas Investimentos é Advanced+ e admin não', () => {
    const l = labelsFor('Intermediate');
    expect(l).toContain('Orçamento');
    expect(l).toContain('Simulador');
    expect(l).toContain('Relatórios');
    expect(l).not.toContain('Investimentos');
    expect(l).not.toContain('Usuários');
  });

  it('Advanced vê Investimentos, mas não admin', () => {
    const l = labelsFor('Advanced');
    expect(l).toContain('Investimentos');
    expect(l).not.toContain('Usuários');
  });

  it('Admin vê a seção de administração completa', () => {
    const l = labelsFor('Admin');
    expect(l).toContain('Usuários');
    expect(l).toContain('Parâmetros');
    expect(l).toContain('Robôs');
  });

  it('o conjunto do Basic é subconjunto do Admin (nada premium/admin vaza para Basic)', () => {
    const basic = labelsFor('Basic');
    const admin = new Set(labelsFor('Admin'));
    basic.forEach((label) => expect(admin.has(label)).toBeTrue());
    expect(admin.size).toBeGreaterThan(basic.length);
  });
});
