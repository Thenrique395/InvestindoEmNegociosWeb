import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';

describe('PublicHeaderComponent', () => {
  let fixture: ComponentFixture<PublicHeaderComponent>;
  let component: PublicHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHeaderComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PublicHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('brandName', 'Investindo em Negócios');
    fixture.componentRef.setInput('isLightTheme', false);
    fixture.detectChanges();
  });

  it('usa o logo escuro quando o tema não é claro', () => {
    expect(component.logoSrc).toBe('/assets/logoHeaderInvestindoemNegocios.png');
  });

  it('usa o logo claro quando o tema é claro', () => {
    fixture.componentRef.setInput('isLightTheme', true);
    fixture.detectChanges();

    expect(component.logoSrc).toBe('/assets/logoHeaderInvestindoemNegocios2.png');
  });

  it('alterna o menu mobile ao clicar no botão hambúrguer', () => {
    expect(component.mobileMenuOpen()).toBeFalse();

    component.toggleMobileMenu();
    expect(component.mobileMenuOpen()).toBeTrue();

    component.toggleMobileMenu();
    expect(component.mobileMenuOpen()).toBeFalse();
  });

  it('fecha o menu mobile e emite sectionRequested ao clicar em um item com âncora', () => {
    component.mobileMenuOpen.set(true);
    const emitted: { sectionId: string }[] = [];
    component.sectionRequested.subscribe((event) => emitted.push(event));

    const item = component.navItems.find((navItem) => navItem.sectionId === 'planos')!;
    const event = new Event('click');
    component.handleNavClick(item, event);

    expect(component.mobileMenuOpen()).toBeFalse();
    expect(emitted.length).toBe(1);
    expect(emitted[0].sectionId).toBe('planos');
  });

  it('emite publicHome ao clicar em um item sem âncora de seção', () => {
    const publicHomeSpy = jasmine.createSpy('publicHome');
    component.publicHome.subscribe(publicHomeSpy);

    const item = component.navItems.find((navItem) => !navItem.sectionId)!;
    const event = new Event('click');
    component.handleNavClick(item, event);

    expect(publicHomeSpy).toHaveBeenCalled();
  });

  it('fecha o menu mobile ao pressionar Esc', () => {
    component.mobileMenuOpen.set(true);

    component.onEscapeKey();

    expect(component.mobileMenuOpen()).toBeFalse();
  });

  it('fecha o menu mobile ao clicar fora do header', () => {
    component.mobileMenuOpen.set(true);

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    component.onDocumentClick({ target: outside } as unknown as MouseEvent);

    expect(component.mobileMenuOpen()).toBeFalse();
    outside.remove();
  });

  it('mantém o menu mobile aberto ao clicar dentro do header', () => {
    component.mobileMenuOpen.set(true);

    const inside = fixture.nativeElement.querySelector('.header') as HTMLElement;
    component.onDocumentClick({ target: inside } as unknown as MouseEvent);

    expect(component.mobileMenuOpen()).toBeTrue();
  });

  it('emite loginRequested e fecha o menu ao usar o link de entrar do menu mobile', () => {
    component.mobileMenuOpen.set(true);
    const loginSpy = jasmine.createSpy('loginRequested');
    component.loginRequested.subscribe(loginSpy);

    component.handleMobileLogin();

    expect(loginSpy).toHaveBeenCalled();
    expect(component.mobileMenuOpen()).toBeFalse();
  });
});
