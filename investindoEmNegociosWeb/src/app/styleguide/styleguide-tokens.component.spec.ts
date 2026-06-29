import { TestBed } from '@angular/core/testing';
import { StyleguideTokensComponent } from './styleguide-tokens.component';

describe('StyleguideTokensComponent', () => {
  it('renderiza sem erro e mostra o token Primary', () => {
    TestBed.configureTestingModule({ imports: [StyleguideTokensComponent] });
    const fixture = TestBed.createComponent(StyleguideTokensComponent);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Primary');
    expect(fixture.nativeElement.textContent).toContain('--primary');
  });

  it('renderiza as 4 classes de botão', () => {
    TestBed.configureTestingModule({ imports: [StyleguideTokensComponent] });
    const fixture = TestBed.createComponent(StyleguideTokensComponent);

    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(4);
  });
});
