import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { StyleguideComponentDetailComponent } from './styleguide-component-detail.component';

function createActivatedRouteMock(slug: string) {
  return { paramMap: new BehaviorSubject(convertToParamMap({ slug })) };
}

function createFixture(slug: string) {
  TestBed.configureTestingModule({
    imports: [StyleguideComponentDetailComponent],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: createActivatedRouteMock(slug) }
    ]
  });
  const fixture = TestBed.createComponent(StyleguideComponentDetailComponent);
  fixture.detectChanges();
  return fixture;
}

describe('StyleguideComponentDetailComponent', () => {
  it('renderiza o demo do PageHeader pro slug page-header', () => {
    const fixture = createFixture('page-header');

    expect(fixture.nativeElement.querySelector('app-page-header')).toBeTruthy();
  });

  it('renderiza o Modal e abre ao clicar no botão de demo', () => {
    const fixture = createFixture('modal');

    expect(fixture.componentInstance.modalOpen()).toBeFalse();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.modalOpen()).toBeTrue();
  });

  it('renderiza o ToastContainer pro slug toast-container, com nota de componente órfão', () => {
    const fixture = createFixture('toast-container');

    expect(fixture.nativeElement.querySelector('app-toast-container')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('não está montado em nenhum template');
  });

  it('renderiza o exemplo do AppCurrencyPipe formatado', () => {
    const fixture = createFixture('app-currency-pipe');

    expect(fixture.nativeElement.textContent).toContain('R$');
  });

  it('mostra mensagem de não encontrado pra um slug inexistente', () => {
    const fixture = createFixture('slug-que-nao-existe');

    expect(fixture.nativeElement.textContent).toContain('não encontrado no catálogo');
  });
});
