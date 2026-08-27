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

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const button = buttons.find((btn) => btn.textContent?.trim() === 'Abrir modal')!;
    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.modalOpen()).toBeTrue();
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
