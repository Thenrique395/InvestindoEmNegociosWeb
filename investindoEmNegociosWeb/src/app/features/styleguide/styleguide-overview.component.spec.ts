import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StyleguideOverviewComponent } from './styleguide-overview.component';
import { STYLEGUIDE_COMPONENTS } from './styleguide-catalog';

describe('StyleguideOverviewComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StyleguideOverviewComponent],
      providers: [provideRouter([])]
    });
  });

  it('renderiza uma linha da tabela para cada item do catálogo', () => {
    const fixture = TestBed.createComponent(StyleguideOverviewComponent);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');

    expect(rows.length).toBe(STYLEGUIDE_COMPONENTS.length);
  });
});
