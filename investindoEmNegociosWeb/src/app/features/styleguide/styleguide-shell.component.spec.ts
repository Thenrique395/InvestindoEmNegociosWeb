import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StyleguideShellComponent } from './styleguide-shell.component';
import { STYLEGUIDE_COMPONENTS } from './styleguide-catalog';

describe('StyleguideShellComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StyleguideShellComponent],
      providers: [provideRouter([])]
    });
  });

  it('renderiza um link de navegação para cada item do catálogo e para Design Tokens', () => {
    const fixture = TestBed.createComponent(StyleguideShellComponent);
    fixture.detectChanges();

    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));

    expect(links.length).toBe(STYLEGUIDE_COMPONENTS.length + 1);
    expect(links.some((link) => link.textContent?.includes('Design Tokens'))).toBeTrue();
    STYLEGUIDE_COMPONENTS.forEach((item) => {
      expect(links.some((link) => link.textContent?.trim() === item.name)).toBeTrue();
    });
  });
});
